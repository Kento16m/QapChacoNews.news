import { createFileRoute, Link } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { ChevronRight, Clock, Eye, FileQuestion } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { NewsletterCompact, ReadingProgress, ShareButtons } from "@/components/news/ArticleExtras";
import { CommentsSection } from "@/components/news/CommentsSection";
import { MostRead, Newsletter } from "@/components/news/HomeSections";
import { CategoryBadge, CoverImage, SectionTitle, StateMessage, timeAgo } from "@/components/news/primitives";
import { useArticle, useRelated } from "@/hooks/use-news";
import { registerArticleView } from "@/lib/api";
import type { Article } from "@/types";

export const Route = createFileRoute("/noticia/$slug")({
  head: () => ({
    meta: [
      { title: "Noticia — QAP ChacoNews" },
      { name: "description", content: "Leé la nota completa en QAP ChacoNews y seguí la actualidad del Chaco paraguayo." },
      { property: "og:title", content: "Noticia — QAP ChacoNews" },
      { property: "og:description", content: "Leé la nota completa en QAP ChacoNews y seguí la actualidad del Chaco paraguayo." },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "/og-image.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Noticia — QAP ChacoNews" },
      { name: "twitter:description", content: "Leé la nota completa en QAP ChacoNews y seguí la actualidad del Chaco paraguayo." },
    ],
  }),
  component: ArticlePage,
});

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function AuthorAvatar({ name, url, size = "h-11 w-11" }: { name: string; url: string | null; size?: string }) {
  return url ? (
    <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground`} aria-hidden="true">{initials(name)}</span>
  );
}

function normalizeArticleContent(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const normalized = trimmed.replace(/\r\n/g, "\n");
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(normalized);

  if (!looksLikeHtml) {
    return normalized
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${block.replace(/\n+/g, " ")}</p>`)
      .join("");
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length > 1) {
    return blocks
      .map((block) => {
        const hasBlockElement = /<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|section|article)>/i.test(block);
        return hasBlockElement ? block : `<p>${block.replace(/\n+/g, " ")}</p>`;
      })
      .join("");
  }

  const hasBlockElement = /<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote|figure|table|pre|section|article)>/i.test(normalized);
  if (hasBlockElement) return normalized;

  return `<p>${normalized.replace(/\n+/g, " ")}</p>`;
}

function SafeHtml({ html }: { html: string }) {
  const [clean, setClean] = useState("");

  useEffect(() => {
    const normalized = normalizeArticleContent(html);
    setClean(DOMPurify.sanitize(normalized));
  }, [html]);

  return (
    <div
      className="prose prose-lg max-w-none prose-p:mb-6 prose-headings:mt-8 prose-headings:mb-4 prose-strong:font-extrabold prose-em:italic prose-img:rounded-3xl prose-figure:my-6 prose-news mx-auto w-full max-w-4xl"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Cargando nota">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-6 w-24 rounded-full" />
      <Skeleton className="mt-4 h-14 w-full max-w-4xl" />
      <Skeleton className="mt-3 h-14 w-3/4 max-w-3xl" />
      <Skeleton className="mt-6 h-11 w-80" />
      <Skeleton className="mt-8 aspect-[21/9] w-full rounded-3xl" />
      <div className="mx-auto mt-10 max-w-[720px] space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-accent text-primary"><FileQuestion className="h-9 w-9" /></span>
        <h1 className="mt-6 font-display text-4xl font-bold">No encontramos esta nota</h1>
        <p className="mt-3 text-muted-foreground">Puede que haya sido movida o que el enlace esté incompleto. Te invitamos a seguir leyendo las últimas noticias del Chaco.</p>
        <Button asChild size="lg" className="mt-8 rounded-full"><Link to="/">Volver a la portada</Link></Button>
      </div>
    </div>
  );
}

function Related({ article }: { article: Article }) {
  const { data, isLoading } = useRelated(article.id, article.category?.id);
  if (isLoading) return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;
  if (!data?.length) return <StateMessage>No hay más noticias en esta sección por ahora.</StateMessage>;
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{data.slice(0, 4).map((a) => <ArticleCard key={a.id} article={a} />)}</div>;
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: a, isLoading, isError } = useArticle(slug);
  const trackedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (a) {
      document.title = `${a.seo_title ?? a.title} — QAP ChacoNews`;

      if (trackedViewRef.current !== a.id) {
        trackedViewRef.current = a.id;
        registerArticleView(a.id);
      }
    } else if (!isLoading) {
      document.title = "Nota no encontrada — QAP ChacoNews";
    }
  }, [a, isLoading]);

  if (isLoading) return <ArticleSkeleton />;
  if (isError) return <div className="mx-auto max-w-3xl px-4 py-16"><StateMessage error>Ocurrió un error al cargar la nota.</StateMessage></div>;
  if (!a) return <NotFound />;

  const authorName = a.author?.full_name ?? "Redacción QAP";

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Inicio</Link>
          {a.category && (<><ChevronRight className="h-3.5 w-3.5" /><Link to="/categoria/$slug" params={{ slug: a.category.slug }} className="hover:text-primary">{a.category.name}</Link></>)}
        </nav>

        <header className="mt-8 max-w-4xl">
          <CategoryBadge category={a.category} />
          <h1 className="mt-4 max-w-none break-words font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[0.92] tracking-[-0.04em] text-foreground hyphens-auto">{a.title}</h1>
          {a.subtitle && <p className="mt-5 text-lg text-muted-foreground sm:text-xl">{a.subtitle}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-3">
              <AuthorAvatar name={authorName} url={a.author?.avatar_url ?? null} />
              <div>
                <p className="font-bold">{authorName}</p>
                <p className="text-muted-foreground"><time dateTime={a.published_at}>{fullDate(a.published_at)}</time> · {timeAgo(a.published_at).toLowerCase()}</p>
              </div>
            </div>
            {a.reading_time_minutes && <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /> {a.reading_time_minutes} min de lectura</span>}
            <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="h-4 w-4" /> {a.views_count.toLocaleString("es-PY")} vistas</span>
          </div>
        </header>

        <figure className="reveal mx-auto mt-10 w-full max-w-[1200px]">
          <div className="aspect-[16/9] overflow-hidden rounded-[28px] bg-transparent shadow-soft md:aspect-[21/9]">
            <CoverImage src={a.cover_image_url} alt={a.title} className="bg-transparent" />
          </div>
          {a.excerpt && <figcaption className="mt-4 text-sm text-muted-foreground">{a.excerpt}</figcaption>}
        </figure>

        <div className="mt-8 lg:hidden"><ShareButtons title={a.title} /></div>

        <div className="mx-auto mt-12 max-w-5xl gap-10 lg:grid lg:grid-cols-[56px_minmax(0,1fr)_minmax(0,280px)] lg:gap-12">
          <aside className="hidden lg:block"><div className="sticky top-40"><ShareButtons title={a.title} vertical /></div></aside>

          <div className="min-w-0">
            <SafeHtml html={a.content} />

            {a.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t pt-6">
                <span className="mr-1 text-sm font-bold">Etiquetas:</span>
                {a.tags.map((t) => (
                  <Link key={t.id} to="/etiqueta/$slug" params={{ slug: t.slug }} className="rounded-full border bg-card px-3.5 py-1.5 text-sm font-semibold transition hover:border-primary hover:text-primary">#{t.name}</Link>
                ))}
              </div>
            )}

            <section className="mt-12 flex items-start gap-4 rounded-3xl bg-card p-6 shadow-soft" aria-label="Sobre el autor">
              <AuthorAvatar name={authorName} url={a.author?.avatar_url ?? null} size="h-16 w-16" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Sobre el autor</p>
                <p className="mt-1 text-lg font-bold">{authorName}</p>
                <p className="mt-1 text-sm text-muted-foreground">Periodista de QAP ChacoNews. Cubre la actualidad del Chaco paraguayo, la producción regional y las historias de sus comunidades.</p>
              </div>
            </section>

            <div className="mt-8 lg:hidden"><ShareButtons title={a.title} /></div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-40 space-y-6"><MostRead /><NewsletterCompact /></div>
          </aside>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <CommentsSection articleId={a.id} />
        </div>

        <section className="reveal mt-20">
          <SectionTitle>Sigue leyendo</SectionTitle>
          <Related article={a} />
        </section>

        <div className="mt-16"><Newsletter /></div>
      </article>
    </>
  );
}
