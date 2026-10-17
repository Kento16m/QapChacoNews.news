import { createFileRoute } from "@tanstack/react-router";
import { SectionTitle } from "@/components/news/primitives";
import { BentoGrid, CategoryBlocks, HeroArticle, LatestPanel, MiniStrip, MostRead, Newsletter } from "@/components/news/HomeSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QAP ChacoNews — Noticias del Chaco paraguayo" },
      { name: "description", content: "Últimas noticias de Filadelfia, Loma Plata, Mariscal Estigarribia, el Chaco y todo Paraguay." },
      { property: "og:title", content: "QAP ChacoNews — Noticias del Chaco paraguayo" },
      { property: "og:description", content: "Últimas noticias del Chaco y de todo Paraguay, las 24 horas." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-6 sm:px-6">
      <MiniStrip />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HeroArticle />
        <LatestPanel />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <section className="reveal">
          <SectionTitle>No te pierdas</SectionTitle>
          <BentoGrid />
        </section>
        <div className="lg:pt-14"><MostRead /></div>
      </div>
      <CategoryBlocks />
      <Newsletter />
    </div>
  );
}
