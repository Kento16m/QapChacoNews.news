import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import DOMPurify from "dompurify";
import { Heart, LogIn, MessageSquare, Reply, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getProfileColor } from "@/lib/profile-colors";
import { supabase } from "@/lib/supabase";

type CommentRecord = {
  id: number;
  article_id: string;
  user_id: string;
  parent_id: number | null;
  body: string;
  like_count: number;
  created_at: string;
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_color: string | null;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-PY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

const sanitizeText = (value: unknown) => {
  const normalized = typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";

  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
};

const offensiveContentMessage = "Tu comentario no es apto para esta comunidad. Por favor, elimina palabras ofensivas o contenido inapropiado y vuelve a intentarlo.";
const rateLimitMessage = "Superaste el límite de mensajes. Por favor, esperá 1 minuto antes de comentar otra vez.";

const isOffensiveContentMessage = (message: string) =>
  /no es apto para esta comunidad|palabras ofensivas|contenido inapropiado|comentario fue bloqueado/i.test(message);

const isRateLimitMessage = (message: string) =>
  /límite|limite|espera 1 minuto|esperá 1 minuto|429|rate limit|too many requests/i.test(message);

const parseJsonStringCandidate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      const message =
        (parsed as Record<string, unknown>).error ??
        (parsed as Record<string, unknown>).message ??
        (parsed as Record<string, unknown>).detail ??
        (parsed as Record<string, unknown>).details ??
        null;

      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  } catch {
    // Ignore invalid JSON and fall back to the raw text.
  }

  return trimmed;
};

const normalizeErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    const raw = parseJsonStringCandidate(error) ?? error.trim();
    if (isOffensiveContentMessage(raw)) return offensiveContentMessage;
    if (isRateLimitMessage(raw)) return rateLimitMessage;
    return raw || "No se pudo publicar el comentario.";
  }

  if (error instanceof Error) {
    const raw = parseJsonStringCandidate(error.message) ?? (error.message || "No se pudo publicar el comentario.");
    if (isOffensiveContentMessage(raw)) return offensiveContentMessage;
    if (isRateLimitMessage(raw)) return rateLimitMessage;
    return raw;
  }

  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    const statusCode = typeof details["status"] === "number" ? details["status"] : null;
    const context = details["context"];

    if (statusCode === 429) {
      return rateLimitMessage;
    }

    const candidates: unknown[] = [
      details["message"],
      details["error"],
      details["detail"],
      details["details"],
      details["hint"],
      details["body"],
      details["data"],
      context,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const text = parseJsonStringCandidate(candidate) ?? candidate.trim();
        if (!text) continue;
        if (isOffensiveContentMessage(text)) return offensiveContentMessage;
        if (isRateLimitMessage(text)) return rateLimitMessage;
        return text;
      }

      if (candidate && typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;
        const nestedKeys = [
          nested["message"],
          nested["error"],
          nested["detail"],
          nested["details"],
          nested["hint"],
          nested["body"],
          nested["data"],
        ];

        for (const nestedValue of nestedKeys) {
          if (typeof nestedValue === "string") {
            const text = parseJsonStringCandidate(nestedValue) ?? nestedValue.trim();
            if (!text) continue;
            if (isOffensiveContentMessage(text)) return offensiveContentMessage;
            if (isRateLimitMessage(text)) return rateLimitMessage;
            return text;
          }
        }
      }
    }

    const jsonText = JSON.stringify(details);
    if (isOffensiveContentMessage(jsonText)) return offensiveContentMessage;
    if (isRateLimitMessage(jsonText)) return rateLimitMessage;
  }

  return "No se pudo publicar el comentario.";
};

const PAGE_SIZE = 10;

class CommentsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CommentsSection crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mt-12 rounded-3xl border border-dashed border-muted-foreground/30 bg-card p-6 text-sm text-muted-foreground">
          No se pudieron cargar los comentarios en este momento. Intentá nuevamente más tarde.
        </section>
      );
    }

    return this.props.children;
  }
}

export function CommentsSection({ articleId }: { articleId: string }) {
  const { openAuthDialog } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyTargetName, setReplyTargetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animatedLikes, setAnimatedLikes] = useState<Record<number, boolean>>({});
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<"popular" | "newest">("popular");
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [closingReplies, setClosingReplies] = useState<Record<number, boolean>>({});
  const [visibleRepliesCounts, setVisibleRepliesCounts] = useState<Record<number, number>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [replyComposerClosing, setReplyComposerClosing] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (highlightedCommentId === null) return;

    const timeout = window.setTimeout(() => {
      setHighlightedCommentId(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [highlightedCommentId]);

  const hydrateProfilesForComments = async (commentBatch: CommentRecord[]) => {
    const uniqueUserIds = [...new Set(commentBatch.map((comment) => comment.user_id))];

    if (uniqueUserIds.length === 0) {
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, profile_color")
      .in("id", uniqueUserIds);

    if (profileError || !profileRows) {
      return;
    }

    const nextProfiles = profileRows.reduce<Record<string, ProfileSummary>>((acc, profile) => {
      acc[profile.id] = {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        profile_color: profile.profile_color ?? getProfileColor(profile.full_name),
      };
      return acc;
    }, {});

    setProfiles((current) => ({ ...current, ...nextProfiles }));
  };

  useEffect(() => {
    if (!supabase || !articleId) return;

    const fetchComments = async (pageIndex = 0, append = false) => {
      if (pageIndex === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) {
        setError("No se pudieron cargar los comentarios.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const nextComments = (data as CommentRecord[]) ?? [];

      setComments((current) => (append ? [...current, ...nextComments] : nextComments));
      setHasMore(nextComments.length === PAGE_SIZE);

      if (nextComments.length > 0) {
        await hydrateProfilesForComments(nextComments);
      }

      if (pageIndex === 0) {
        setProfiles((current) => {
          const next = { ...current };
          Object.keys(next).forEach((key) => {
            if (!nextComments.some((comment) => comment.user_id === key)) delete next[key];
          });
          return next;
        });
      }

      setLoading(false);
      setLoadingMore(false);
    };

    fetchComments(0, false);

    const commentsChannel = supabase.channel(`comments-${articleId}`);
    commentsChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `article_id=eq.${articleId}`,
        },
        () => {
          setPage(0);
          setComments([]);
          fetchComments(0, false);
        }
      )
      .subscribe();

    const likesChannel = supabase.channel(`comment-likes-${articleId}`);
    likesChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_likes",
        },
        () => {
          setPage(0);
          setComments([]);
          fetchComments(0, false);
        }
      )
      .subscribe();

    return () => {
      commentsChannel.unsubscribe();
      likesChannel.unsubscribe();
    };
  }, [articleId]);

  const handleReply = (commentId: number, authorName?: string) => {
    if (!Number.isFinite(commentId) || commentId < 0) {
      return;
    }

    setReplyComposerClosing(false);
    setReplyTo(commentId);
    setReplyTargetName(authorName || "");
    setDraft("");
    setError("");
  };

  const sortComments = (list: CommentRecord[]) =>
    [...list].sort((a, b) => {
      const aIsOwner = session?.user?.id === a.user_id ? 1 : 0;
      const bIsOwner = session?.user?.id === b.user_id ? 1 : 0;

      if (aIsOwner !== bIsOwner) return bIsOwner - aIsOwner;

      if (b.like_count !== a.like_count) return b.like_count - a.like_count;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const commentsByParent = useMemo(() => {
    const grouped: Record<number, CommentRecord[]> = {};

    for (const comment of sortComments(comments)) {
      if (comment.parent_id !== null) {
        grouped[comment.parent_id] = grouped[comment.parent_id] ?? [];
        grouped[comment.parent_id].push(comment);
      }
    }

    return Object.fromEntries(
      Object.entries(grouped).map(([parentId, items]) => [Number(parentId), sortComments(items)])
    );
  }, [comments, session]);

  const sortedRootComments = useMemo(() => {
    const list = comments.filter((comment) => comment.parent_id === null);
    if (sortMode === "newest") {
      return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return sortComments(list);
  }, [comments, session, sortMode]);

  const rootComments = sortedRootComments;

  const handleToggleReplies = (commentId: number) => {
    const isExpanded = Boolean(expandedReplies[commentId]);

    if (isExpanded) {
      setClosingReplies((current) => ({ ...current, [commentId]: true }));
      window.setTimeout(() => {
        setExpandedReplies((current) => ({ ...current, [commentId]: false }));
        setClosingReplies((current) => ({ ...current, [commentId]: false }));
      }, 220);
      return;
    }

    setExpandedReplies((current) => ({ ...current, [commentId]: true }));
    setClosingReplies((current) => ({ ...current, [commentId]: false }));
    setVisibleRepliesCounts((current) => ({
      ...current,
      [commentId]: current[commentId] ?? Math.min(commentsByParent[commentId]?.length ?? 0, 8),
    }));
  };

  const handleLoadMoreReplies = (commentId: number) => {
    const totalReplies = commentsByParent[commentId]?.length ?? 0;
    const currentVisible = visibleRepliesCounts[commentId] ?? Math.min(totalReplies, 8);

    setVisibleRepliesCounts((current) => ({
      ...current,
      [commentId]: Math.min(totalReplies, currentVisible + 8),
    }));
  };

  const submitComment = async () => {
    if (!supabase) {
      setError("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const currentUser = session?.user;
    if (!session?.access_token || !currentUser?.id) {
      setError("Tu sesión de Supabase está vencida o no está iniciada. Volvé a iniciar sesión para comentar.");
      return;
    }

    const cleanBody = sanitizeText(draft);
    if (cleanBody.length < 2 || cleanBody.length > 2000) {
      setError("Tu comentario debe tener entre 2 y 2000 caracteres.");
      return;
    }

    const optimisticComment: CommentRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      article_id: articleId,
      user_id: currentUser.id,
      parent_id: replyTo,
      body: cleanBody,
      like_count: 0,
      created_at: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setError("");
    setComments((current) => {
      const next = [optimisticComment, ...current];
      return next.slice(0, PAGE_SIZE);
    });
    setHighlightedCommentId(optimisticComment.id);

    if (replyTo !== null) {
      setExpandedReplies((current) => ({ ...current, [replyTo]: true }));
      setVisibleRepliesCounts((current) => ({
        ...current,
        [replyTo]: Math.max(current[replyTo] ?? 8, (commentsByParent[replyTo]?.length ?? 0) + 1),
      }));
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("moderate-comment", {
        body: {
          article_id: articleId,
          parent_id: replyTo,
          user_id: currentUser.id,
          body: cleanBody,
        },
      });

      console.debug("Supabase function response:", { data, invokeError });

      const payloadError = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
      const payloadMessage = payloadError ? normalizeErrorMessage(payloadError) : normalizeErrorMessage(invokeError);

      if (payloadError || invokeError) {
        const statusCode =
          typeof invokeError === "object" && invokeError !== null && "status" in invokeError
            ? Number((invokeError as Record<string, unknown>).status)
            : null;

        const authIssue =
          typeof invokeError === "object" &&
          invokeError !== null &&
          "message" in invokeError &&
          typeof invokeError.message === "string" &&
          /jwt|unauthorized|401|token/i.test(invokeError.message);

        const friendlyMessage = statusCode === 429 || isRateLimitMessage(payloadMessage)
          ? rateLimitMessage
          : isOffensiveContentMessage(payloadMessage)
            ? offensiveContentMessage
            : authIssue
              ? "La sesión de Supabase no es válida o expiró. Volvé a iniciar sesión e intentá nuevamente."
              : payloadMessage === "Edge Function returned a non-2xx status code"
                ? "No se pudo publicar el comentario. Intentalo nuevamente en unos segundos."
                : payloadMessage;

        setError(friendlyMessage);
        setIsSubmitting(false);
        return;
      }

      if (data && typeof data === "object" && Object.keys(data as object).length === 0) {
        console.error("Supabase function returned empty payload:", data);
        setError("La función respondió vacía. Revisa los logs de Supabase.");
        setIsSubmitting(false);
        return;
      }

      const insertedComment = (data as { comment?: CommentRecord })?.comment;
      if (insertedComment) {
        setComments((current) => {
          const withoutOptimistic = current.filter((item) => item.id !== optimisticComment.id);
          const existing = withoutOptimistic.some((item) => item.id === insertedComment.id);
          if (existing) return withoutOptimistic;
          const next = [insertedComment, ...withoutOptimistic];
          return next.slice(0, PAGE_SIZE);
        });

        if (insertedComment.parent_id !== null) {
          setExpandedReplies((current) => ({
            ...current,
            [insertedComment.parent_id as number]: true,
          }));
          setVisibleRepliesCounts((current) => ({
            ...current,
            [insertedComment.parent_id as number]: Math.max(
              current[insertedComment.parent_id as number] ?? 8,
              (commentsByParent[insertedComment.parent_id as number]?.length ?? 0) + 1
            ),
          }));
        }

        setHighlightedCommentId(insertedComment.id);
      } else {
        setComments((current) => current.filter((item) => item.id !== optimisticComment.id));
      }

      setPage(0);
      setHasMore(true);
      setDraft("");
      setReplyComposerClosing(true);
      window.setTimeout(() => {
        setReplyTo(null);
        setReplyTargetName("");
        setReplyComposerClosing(false);
      }, 180);
    } catch (invokeError) {
      setComments((current) => current.filter((item) => item.id !== optimisticComment.id));
      const message = normalizeErrorMessage(invokeError);
      setError(
        /jwt|unauthorized|401|token/i.test(message)
          ? "La sesión de Supabase no es válida o expiró. Volvé a iniciar sesión e intentá nuevamente."
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const likeComment = async (commentId: number) => {
    if (!supabase) {
      setError("La conexión con Supabase no está configurada.");
      return;
    }

    const currentUser = session?.user;
    if (!currentUser?.id) {
      setError("Iniciá sesión para dar like.");
      return;
    }

    setAnimatedLikes((current) => ({ ...current, [commentId]: true }));
    window.setTimeout(() => {
      setAnimatedLikes((current) => ({ ...current, [commentId]: false }));
    }, 420);

    const { error: likeError } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: currentUser.id,
    });

    if (likeError) {
      if (likeError.code === "23505") {
        setError("Ya diste like a este comentario.");
      } else {
        setError("No se pudo registrar el like.");
      }
      setAnimatedLikes((current) => ({ ...current, [commentId]: false }));
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, like_count: comment.like_count + 1 } : comment
      )
    );
    setError("");
  };

  const deleteComment = async (commentId: number) => {
    if (!supabase) return;
    const currentUser = session?.user;
    if (!currentUser?.id) return;

    setIsDeletingComment(true);
    setError("");

    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", currentUser.id);

    if (error) {
      setError("No se pudo eliminar el comentario.");
      setIsDeletingComment(false);
      setDeleteTargetId(null);
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setExpandedReplies((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setClosingReplies((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setVisibleRepliesCounts((current) => {
      const next = { ...current };
      delete next[commentId];
      return next;
    });

    window.setTimeout(() => {
      setIsDeletingComment(false);
      setDeleteTargetId(null);
    }, 180);
  };

  if (!supabase) {
    return (
      <section className="mt-12 rounded-3xl border border-dashed border-muted-foreground/30 bg-card p-6 text-sm text-muted-foreground">
        Configura las variables de entorno de Supabase para activar comentarios.
      </section>
    );
  }

  return (
    <CommentsErrorBoundary>
      <style>{`
        .comments-shell {
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #f7f7f8;
          border-radius: 24px;
          padding: 18px 18px 14px;
          box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.02);
        }

        .comments-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .comments-title {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #111827;
        }

        .sort-toggle {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(148, 163, 184, 0.6);
          background: rgba(255, 255, 255, 0.7);
          border-radius: 999px;
          padding: 4px;
          gap: 4px;
        }

        .sort-button {
          border: none;
          background: transparent;
          border-radius: 999px;
          padding: 7px 14px;
          font-size: 0.86rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sort-button.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .composer {
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: #f3f4f6;
          border-radius: 18px;
          padding: 14px 14px 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 78px;
        }

        .composer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        }

        .composer-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0f172a;
          font-size: 1rem;
          min-height: 52px;
        }

        .composer-input::placeholder {
          color: #64748b;
        }

        .send-btn {
          width: 46px;
          height: 46px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #5b47d1, #4f46e5);
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 12px 18px rgba(79, 70, 229, 0.20);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .send-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 22px rgba(79, 70, 229, 0.25);
        }

        .send-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .comment-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          padding: 16px 18px 14px;
          transition: all 0.2s ease;
        }

        .comment-card.highlighted {
          border-color: rgba(79, 70, 229, 0.4);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.08);
          animation: commentHighlight 0.46s ease;
        }

        @keyframes commentHighlight {
          0% {
            transform: scale(0.985);
            box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.18);
          }
          35% {
            transform: scale(1.005);
            box-shadow: 0 0 0 8px rgba(79, 70, 229, 0.08);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.06);
          }
        }

        .comment-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .comment-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .comment-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        }

        .comment-meta {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .comment-author {
          font-size: 0.94rem;
          font-weight: 700;
          color: #111827;
        }

        .comment-date {
          font-size: 0.74rem;
          color: #64748b;
          margin-top: 2px;
        }

        .comment-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #64748b;
          padding: 0;
          cursor: pointer;
        }

        .comment-body {
          margin-top: 12px;
          color: #111827;
          font-size: 1rem;
          line-height: 1.72;
          white-space: pre-wrap;
        }

        .comment-actions {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .comment-icon-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          font-size: 0.92rem;
          color: #475569;
          font-weight: 600;
          padding: 0;
          cursor: pointer;
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .comment-icon-button:hover {
          transform: translateY(-1px);
        }

        .comment-icon-button.like {
          color: #4b5563;
        }

        .comment-icon-button.like.is-animating {
          animation: likePulse 0.35s ease;
        }

        @keyframes likePulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.18); }
          50% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }

        @keyframes sendPulse {
          0% { transform: scale(1); box-shadow: 0 10px 18px rgba(79, 70, 229, 0.18); }
          60% { transform: scale(1.08); box-shadow: 0 16px 26px rgba(79, 70, 229, 0.26); }
          100% { transform: scale(1); box-shadow: 0 12px 20px rgba(79, 70, 229, 0.2); }
        }

        .send-btn.sending {
          animation: sendPulse 0.7s ease-in-out infinite alternate;
        }

        .comment-icon-button:focus-visible,
        .sort-button:focus-visible,
        .send-btn:focus-visible {
          outline: 2px solid rgba(79, 70, 229, 0.36);
          outline-offset: 2px;
        }

        .replies-toggle {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #4f46e5;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .reply-box {
          margin-top: 14px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(248, 250, 252, 0.9);
          border-radius: 16px;
          padding: 12px;
          animation: replyReveal 0.24s ease;
          transform-origin: top center;
        }

        .reply-box.is-closing {
          animation: replyCollapse 0.22s ease forwards;
        }

        .reply-label {
          font-size: 0.74rem;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .reply-actions {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .reply-cancel,
        .reply-submit {
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: white;
          color: #0f172a;
          padding: 8px 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .reply-submit {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
        }

        .reply-wrapper {
          margin-top: 12px;
          border-left: 1px solid rgba(148, 163, 184, 0.3);
          padding-left: 14px;
          margin-left: 8px;
          display: grid;
          gap: 12px;
          animation: replyReveal 0.26s ease;
        }

        .reply-wrapper.is-closing {
          animation: replyCollapse 0.22s ease forwards;
        }

        .comment-card.is-removing {
          opacity: 0;
          transform: translateY(-8px) scale(0.98);
          filter: blur(2px);
          pointer-events: none;
          transition: all 0.22s ease;
        }

        .delete-confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.46);
          display: grid;
          place-items: center;
          z-index: 50;
          backdrop-filter: blur(2px);
        }

        .delete-confirm-dialog {
          width: min(92vw, 420px);
          background: white;
          border-radius: 22px;
          padding: 22px 20px 18px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 25px 50px rgba(15, 23, 42, 0.18);
          animation: dialogReveal 0.22s ease;
        }

        .delete-confirm-title {
          font-size: 1.04rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .delete-confirm-body {
          color: #475569;
          font-size: 0.94rem;
          line-height: 1.5;
          margin-bottom: 18px;
        }

        .delete-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .delete-confirm-button {
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: white;
          color: #0f172a;
          border-radius: 12px;
          padding: 9px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .delete-confirm-button.primary {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: transparent;
          color: white;
        }

        @keyframes replyReveal {
          from {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }

        @keyframes replyCollapse {
          from {
            opacity: 1;
            transform: translateY(0);
            max-height: 4000px;
          }
          to {
            opacity: 0;
            transform: translateY(-8px);
            max-height: 0;
            margin-top: 0;
            overflow: hidden;
          }
        }

        @keyframes dialogReveal {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <section className="comments-shell">
      <div className="comments-topbar">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-700" />
          <h3 className="comments-title">Comentarios ({comments.length})</h3>
        </div>

        <div className="sort-toggle" aria-label="Ordenar comentarios">
          <button
            type="button"
            className={`sort-button ${sortMode === "popular" ? "active" : ""}`}
            onClick={() => setSortMode("popular")}
          >
            Popular
          </button>
          <button
            type="button"
            className={`sort-button ${sortMode === "newest" ? "active" : ""}`}
            onClick={() => setSortMode("newest")}
          >
            Más nuevos
          </button>
        </div>
      </div>

      {!session || !session.user ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Debés iniciar sesión para publicar o responder comentarios.</p>
          <Button variant="default" onClick={() => openAuthDialog("login")}>
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </Button>
        </div>
      ) : (
        !replyTo && (
          <div className="mb-6">
            <div className="composer">
              <div className="composer-avatar">
                {session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture ? (
                  <img
                    src={session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture}
                    alt="Tu avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                    style={{
                      backgroundColor: getProfileColor(
                        session.user.user_metadata?.full_name ||
                          session.user.user_metadata?.name ||
                          session.user.email?.split("@")[0] ||
                          "Usuario"
                      ),
                    }}
                  >
                    {(session.user.user_metadata?.full_name ||
                      session.user.user_metadata?.name ||
                      session.user.email?.split("@")[0] ||
                      "Usuario")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("") || "U"}
                  </div>
                )}
              </div>
              <input
                aria-label="Escribir comentario"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe tu comentario aquí..."
                maxLength={2000}
                className="composer-input"
              />
              <button
                type="button"
                disabled={isSubmitting || !draft.trim()}
                onClick={submitComment}
                className={`send-btn ${isSubmitting ? "sending" : ""}`}
                aria-label="Enviar comentario"
              >
                <Send className={`h-4 w-4 ${isSubmitting ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </div>
        )
      )}

      {deleteTargetId !== null && (
        <div className="delete-confirm-overlay" onClick={() => !isDeletingComment && setDeleteTargetId(null)}>
          <div className="delete-confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm-title">Eliminar comentario</div>
            <p className="delete-confirm-body">¿Seguro que querés borrar este comentario? Esta acción no se puede deshacer.</p>
            <div className="delete-confirm-actions">
              <button type="button" className="delete-confirm-button" onClick={() => setDeleteTargetId(null)} disabled={isDeletingComment}>
                Cancelar
              </button>
              <button
                type="button"
                className="delete-confirm-button primary"
                onClick={async () => {
                  if (deleteTargetId === null) return;
                  await deleteComment(deleteTargetId);
                }}
                disabled={isDeletingComment}
              >
                {isDeletingComment ? "Eliminando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted/70" />
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Todavía no hay comentarios. ¡Sé el primero en comentar!
        </div>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              children={commentsByParent[comment.id] ?? []}
              childrenMap={commentsByParent}
              session={session}
              profiles={profiles}
              onReply={handleReply}
              onLike={likeComment}
              onDelete={(commentId) => setDeleteTargetId(commentId)}
              animatedLikes={animatedLikes}
              highlighted={highlightedCommentId === comment.id}
              closingReplies={closingReplies}
              isRemoving={deleteTargetId === comment.id && isDeletingComment}
              depth={0}
              replyTo={replyTo}
              replyTargetName={replyTargetName}
              draft={draft}
              onDraftChange={setDraft}
              onCancelReply={() => {
                setReplyComposerClosing(true);
                window.setTimeout(() => {
                  setReplyTo(null);
                  setReplyTargetName("");
                  setDraft("");
                  setReplyComposerClosing(false);
                }, 180);
              }}
              onSubmitReply={submitComment}
              isSubmitting={isSubmitting}
              isRepliesExpanded={Boolean(expandedReplies[comment.id])}
              expandedReplies={expandedReplies}
              visibleRepliesCounts={visibleRepliesCounts}
              onLoadMoreReplies={handleLoadMoreReplies}
              onToggleReplies={handleToggleReplies}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  setLoadingMore(true);
                  const from = nextPage * PAGE_SIZE;
                  const to = from + PAGE_SIZE - 1;

                  const { data, error: fetchError } = await supabase
                    .from("comments")
                    .select("*")
                    .eq("article_id", articleId)
                    .order("created_at", { ascending: false })
                    .range(from, to);

                  if (fetchError) {
                    setError("No se pudieron cargar más comentarios.");
                    setLoadingMore(false);
                    return;
                  }

                  const more = (data as CommentRecord[]) ?? [];
                  const merged = [...comments, ...more];
                  setComments(merged);
                  if (more.length > 0) {
                    await hydrateProfilesForComments(more);
                  }
                  setHasMore(more.length === PAGE_SIZE);
                  setLoadingMore(false);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </Button>
            </div>
          )}
        </div>
      )}
      </section>
    </CommentsErrorBoundary>
  );
}

function CommentThread({
  comment,
  children,
  childrenMap,
  session,
  profiles,
  onReply,
  onLike,
  onDelete,
  animatedLikes,
  highlighted,
  isRemoving,
  depth,
  replyTo,
  replyTargetName,
  draft,
  onDraftChange,
  onCancelReply,
  onSubmitReply,
  isSubmitting,
  isRepliesExpanded,
  expandedReplies,
  closingReplies,
  visibleRepliesCounts,
  onToggleReplies,
  onLoadMoreReplies,
}: {
  comment: CommentRecord;
  children: CommentRecord[];
  childrenMap: Record<number, CommentRecord[]>;
  session: any;
  profiles: Record<string, ProfileSummary>;
  onReply: (id: number, authorName?: string) => void;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
  animatedLikes: Record<number, boolean>;
  highlighted?: boolean;
  isRemoving?: boolean;
  depth: number;
  replyTo: number | null;
  replyTargetName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  isSubmitting: boolean;
  isRepliesExpanded?: boolean;
  expandedReplies?: Record<number, boolean>;
  closingReplies?: Record<number, boolean>;
  visibleRepliesCounts?: Record<number, number>;
  onToggleReplies?: (commentId: number) => void;
  onLoadMoreReplies?: (commentId: number) => void;
}) {
  const safeBody = sanitizeText(comment?.body ?? "");
  const profile = profiles?.[comment?.user_id ?? ""];
  const sessionUserMeta = session?.user?.user_metadata ?? {};
  const profileFallbackName =
    profile?.full_name?.trim() ||
    (comment.user_id === session?.user?.id
      ? sessionUserMeta.full_name || sessionUserMeta.name || session?.user?.email?.split("@")[0]
      : null) ||
    "Usuario";
  const avatarUrl =
    typeof profile?.avatar_url === "string" && profile.avatar_url.trim()
      ? profile.avatar_url
      : comment.user_id === session?.user?.id
        ? sessionUserMeta.avatar_url || sessionUserMeta.picture || null
        : null;
  const fallbackAvatarSource = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl : profileFallbackName;
  const authorName = String(profileFallbackName || "Usuario");
  const profileColor = profile?.profile_color ?? getProfileColor(authorName);
  const isAnimating = Boolean(animatedLikes[comment.id]);
  const generatedInitials = String(fallbackAvatarSource ?? "Usuario")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const safeChildren = Array.isArray(children) ? children : [];
  const visibleChildren = safeChildren.slice(0, visibleRepliesCounts?.[comment.id] ?? Math.min(safeChildren.length, 8));
  const hasMoreReplies = safeChildren.length > visibleChildren.length;

  return (
    <div
      className={`comment-card ${highlighted ? "highlighted" : ""} ${isRemoving ? "is-removing" : ""}`}
      style={{ marginLeft: depth > 0 ? `${depth * 18}px` : 0 }}
    >
      <div className="comment-header">
        <div className="comment-user">
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="comment-user-avatar" />
          ) : (
            <div
              className="comment-user-avatar flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: profileColor }}
            >
              {generatedInitials}
            </div>
          )}

          <div className="comment-meta">
            <span className="comment-author">{authorName}</span>
            <span className="comment-date">{formatDate(comment.created_at)}</span>
          </div>
        </div>

        {session?.user?.id === comment.user_id && (
          <button type="button" onClick={() => onDelete(comment.id)} className="comment-ghost" aria-label="Eliminar comentario">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="comment-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(safeBody) }} />

      <div className="comment-actions">
        <button
          type="button"
          className={`comment-icon-button like ${isAnimating ? "is-animating" : ""}`}
          onClick={() => onLike(comment.id)}
        >
          <Heart
            className={`h-4 w-4 ${isAnimating ? "fill-red-500 text-red-500" : "text-slate-700"}`}
            style={isAnimating ? { animation: "heart-pop 0.45s ease-in-out" } : undefined}
          />
          <span>{comment.like_count}</span>
        </button>
        <button type="button" className="comment-icon-button" onClick={() => onReply(comment.id, authorName)}>
          <Reply className="h-4 w-4" />
          <span>Responder</span>
        </button>
      </div>

      {safeChildren.length > 0 && (
        <button
          type="button"
          className="replies-toggle"
          onClick={() => onToggleReplies?.(comment.id)}
        >
          <span className="inline-block" style={{ transform: isRepliesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
            ▾
          </span>
          {isRepliesExpanded ? `Ocultar ${safeChildren.length} ${safeChildren.length === 1 ? "respuesta" : "respuestas"}` : `Ver ${safeChildren.length} ${safeChildren.length === 1 ? "respuesta" : "respuestas"}`}
        </button>
      )}

      {replyTo === comment.id && session && (
        <div className={`reply-box ${replyComposerClosing ? "is-closing" : ""}`}>
          <div className="reply-label">Respondiendo a {replyTargetName || "este comentario"}</div>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={3}
            maxLength={2000}
          />

          <div className="reply-actions">
            <button type="button" className="reply-cancel" onClick={onCancelReply}>
              Cancelar
            </button>
            <button type="button" className="reply-submit" disabled={isSubmitting || !draft.trim()} onClick={onSubmitReply}>
              Responder
            </button>
          </div>
        </div>
      )}

      {safeChildren.length > 0 && isRepliesExpanded && (
        <div className={`reply-wrapper ${closingReplies?.[comment.id] ? "is-closing" : ""}`}>
          {visibleChildren.map((child) => (
            <CommentThread
              key={child.id}
              comment={child}
              children={childrenMap[child.id] ?? []}
              childrenMap={childrenMap}
              session={session}
              profiles={profiles}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              animatedLikes={animatedLikes}
              depth={depth + 1}
              replyTo={replyTo}
              replyTargetName={replyTargetName}
              draft={draft}
              onDraftChange={onDraftChange}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              isSubmitting={isSubmitting}
              isRepliesExpanded={Boolean(expandedReplies?.[child.id])}
              expandedReplies={expandedReplies}
              closingReplies={closingReplies}
              visibleRepliesCounts={visibleRepliesCounts}
              onToggleReplies={onToggleReplies}
              onLoadMoreReplies={onLoadMoreReplies}
            />
          ))}

          {hasMoreReplies && (
            <button
              type="button"
              className="replies-toggle replies-more"
              onClick={() => onLoadMoreReplies?.(comment.id)}
            >
              Cargar más respuestas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
