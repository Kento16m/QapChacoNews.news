import { useEffect, useMemo, useState } from "react";
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

const sanitizeText = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();

const normalizeErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    const text = error.trim();
    return text || "No se pudo publicar el comentario.";
  }

  if (error instanceof Error) {
    return error.message || "No se pudo publicar el comentario.";
  }

  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    const context = details["context"];

    if (context && typeof context === "object") {
      const contextDetails = context as Record<string, unknown>;
      const nestedContextMessage =
        contextDetails["message"] ??
        contextDetails["error"] ??
        contextDetails["detail"] ??
        contextDetails["details"] ??
        contextDetails["hint"] ??
        contextDetails["data"] ??
        contextDetails["body"] ??
        null;

      if (typeof nestedContextMessage === "string" && nestedContextMessage.trim()) {
        return nestedContextMessage.trim();
      }

      if (nestedContextMessage && typeof nestedContextMessage === "object") {
        const inner = nestedContextMessage as Record<string, unknown>;
        const innerMessage =
          inner.message ??
          inner.error ??
          inner.detail ??
          inner.details ??
          inner.hint ??
          JSON.stringify(inner);

        if (typeof innerMessage === "string" && innerMessage.trim()) {
          return innerMessage.trim();
        }
      }
    }

    const nestedMessage =
      details["message"] ??
      details["error"] ??
      details["detail"] ??
      details["details"] ??
      details["context"] ??
      details["hint"] ??
      JSON.stringify(details);

    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }

    if (nestedMessage && typeof nestedMessage === "object") {
      return JSON.stringify(nestedMessage);
    }
  }

  return "No se pudo publicar el comentario.";
};

const PAGE_SIZE = 10;

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

      const uniqueUserIds = [...new Set(nextComments.map((comment) => comment.user_id))];

      if (uniqueUserIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, profile_color")
          .in("id", uniqueUserIds);

        if (!profileError) {
          const nextProfiles = (profileRows ?? []).reduce<Record<string, ProfileSummary>>((acc, profile) => {
            acc[profile.id] = {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              profile_color: profile.profile_color ?? getProfileColor(profile.full_name),
            };
            return acc;
          }, {});
          setProfiles((current) => ({ ...current, ...nextProfiles }));
        }
      }

      if (pageIndex === 0) {
        setProfiles((current) => {
          const next = { ...current };
          Object.keys(next).forEach((key) => {
            if (!uniqueUserIds.includes(key)) delete next[key];
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

  const rootComments = useMemo(
    () => sortComments(comments.filter((comment) => comment.parent_id === null)),
    [comments, session]
  );

  const submitComment = async () => {
    if (!supabase) {
      setError("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
      return;
    }

    if (!session?.access_token || !session?.user?.id) {
      setError("Tu sesión de Supabase está vencida o no está iniciada. Volvé a iniciar sesión para comentar.");
      return;
    }

    const cleanBody = sanitizeText(draft);
    if (cleanBody.length < 2 || cleanBody.length > 2000) {
      setError("Tu comentario debe tener entre 2 y 2000 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("moderate-comment", {
        body: {
          article_id: articleId,
          parent_id: replyTo,
          body: cleanBody,
        },
      });

      console.debug("Supabase function response:", { data, invokeError });

      if (invokeError) {
        const authIssue =
          typeof invokeError === "object" &&
          invokeError !== null &&
          "message" in invokeError &&
          typeof invokeError.message === "string" &&
          /jwt|unauthorized|401|token/i.test(invokeError.message);

        const payloadMessage = normalizeErrorMessage(invokeError);
        const friendlyMessage = authIssue
          ? "La sesión de Supabase no es válida o expiró. Volvé a iniciar sesión e intentá nuevamente."
          : payloadMessage === "Edge Function returned a non-2xx status code"
            ? "Tu comentario no es apto para esta comunidad. Por favor, elimina palabras ofensivas o contenido inapropiado y vuelve a intentarlo."
            : payloadMessage;

        setError(friendlyMessage);
        setIsSubmitting(false);
        return;
      }

      if (data && typeof data === "object" && "error" in data) {
        const payloadError = (data as { error?: unknown }).error;
        setError(normalizeErrorMessage(payloadError));
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
          const existing = current.some((item) => item.id === insertedComment.id);
          if (existing) return current;
          const next = [insertedComment, ...current];
          return next.slice(0, PAGE_SIZE);
        });
        setHighlightedCommentId(insertedComment.id);
      }

      setPage(0);
      setHasMore(true);
      setDraft("");
      setReplyTo(null);
      setReplyTargetName("");
    } catch (invokeError) {
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

    if (!session) {
      setError("Iniciá sesión para dar like.");
      return;
    }

    setAnimatedLikes((current) => ({ ...current, [commentId]: true }));
    window.setTimeout(() => {
      setAnimatedLikes((current) => ({ ...current, [commentId]: false }));
    }, 420);

    const { error: likeError } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: session.user.id,
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
    if (!session) return;

    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", session.user.id);
    if (error) {
      setError("No se pudo eliminar el comentario.");
    }
  };

  if (!supabase) {
    return (
      <section className="mt-12 rounded-3xl border border-dashed border-muted-foreground/30 bg-card p-6 text-sm text-muted-foreground">
        Configura las variables de entorno de Supabase para activar comentarios.
      </section>
    );
  }

  return (
    <>
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(0.8); }
          30% { transform: scale(1.45); }
          55% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }

        @keyframes comment-pop {
          0% { transform: scale(0.96); opacity: 0.7; }
          35% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <section className="mt-12 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">Comentarios</h3>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          {comments.length} {comments.length === 1 ? "comentario" : "comentarios"}
        </span>
      </div>

      {!session ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Debés iniciar sesión para publicar o responder comentarios.</p>
          <Button variant="default" onClick={() => openAuthDialog("login")}>
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </Button>
        </div>
      ) : (
        !replyTo && (
          <div className="mb-6 space-y-3 rounded-2xl border border-border bg-background p-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribí tu comentario sobre esta nota..."
              maxLength={2000}
              rows={4}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">Máx. 2000 caracteres</div>
              <Button type="button" disabled={isSubmitting || !draft.trim()} onClick={submitComment}>
                <Send className="h-4 w-4" /> Publicar
              </Button>
            </div>
          </div>
        )
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
              onDelete={deleteComment}
              animatedLikes={animatedLikes}
              highlighted={highlightedCommentId === comment.id}
              depth={0}
              replyTo={replyTo}
              replyTargetName={replyTargetName}
              draft={draft}
              onDraftChange={setDraft}
              onCancelReply={() => {
                setReplyTo(null);
                setReplyTargetName("");
                setDraft("");
              }}
              onSubmitReply={submitComment}
              isSubmitting={isSubmitting}
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
                  setComments((current) => [...current, ...more]);
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
    </>
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
  depth,
  replyTo,
  replyTargetName,
  draft,
  onDraftChange,
  onCancelReply,
  onSubmitReply,
  isSubmitting,
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
  depth: number;
  replyTo: number | null;
  replyTargetName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  isSubmitting: boolean;
}) {
  const safeBody = sanitizeText(comment.body);
  const profile = profiles[comment.user_id];
  const sessionUserMeta = session?.user?.user_metadata ?? {};
  const profileFallbackName =
    profile?.full_name?.trim() ||
    (comment.user_id === session?.user?.id
      ? sessionUserMeta.full_name || sessionUserMeta.name || session?.user?.email?.split("@")[0]
      : null) ||
    "Usuario";
  const avatarUrl =
    profile?.avatar_url ||
    (comment.user_id === session?.user?.id
      ? sessionUserMeta.avatar_url || sessionUserMeta.picture || null
      : null);
  const authorName = profileFallbackName;
  const initials = authorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
  const profileColor = profile?.profile_color ?? getProfileColor(authorName);
  const isAnimating = Boolean(animatedLikes[comment.id]);

  return (
    <div
      className={`rounded-2xl border bg-background p-4 transition-all duration-300 ${highlighted ? "border-primary shadow-[0_0_0_2px_rgba(59,130,246,0.15)] animate-[comment-pop_0.7s_ease-out]" : "border-border"}`}
      style={{ marginLeft: depth > 0 ? `${depth * 18}px` : 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-1 ring-white/50"
              style={{ backgroundColor: profileColor }}
            >
              {initials}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold">{authorName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
          </div>
        </div>

        {session?.user?.id === comment.user_id && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(comment.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        )}
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(safeBody) }} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onReply(comment.id, authorName)}>
          <Reply className="h-4 w-4" /> Responder
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onLike(comment.id)}
          className={isAnimating ? "scale-110 transition-transform duration-200" : "transition-transform duration-200 hover:scale-105"}
        >
          <Heart
            className={`h-4 w-4 ${isAnimating ? "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" : "text-foreground"}`}
            style={isAnimating ? { animation: "heart-pop 0.45s ease-in-out" } : undefined}
          />
          <span className="ml-1">{comment.like_count}</span>
        </Button>
      </div>

      {replyTo === comment.id && session && (
        <div className="mt-4 rounded-2xl border border-border bg-background p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Respondiendo a {replyTargetName || "este comentario"}</div>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Escribí tu respuesta..."
            rows={3}
            maxLength={2000}
          />

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancelReply}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={isSubmitting || !draft.trim()} onClick={onSubmitReply}>
              <Send className="h-4 w-4" /> Responder
            </Button>
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-4 space-y-3 border-l border-border pl-3">
          {children.map((child) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
