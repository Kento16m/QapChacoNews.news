import { Link } from "@tanstack/react-router";
import { useCategories } from "@/hooks/use-news";
import { Logo } from "./primitives";
import { socials } from "./SiteHeader";

export function SiteFooter() {
  const { data: cats } = useCategories();
  return (
    <footer className="mt-20 bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo className="h-16" />
          <p className="mt-4 max-w-xs text-sm text-navy-muted">El medio digital del Chaco paraguayo. Noticias de Filadelfia, Loma Plata, Mariscal Estigarribia y todo el país, las 24 horas.</p>
          <div className="mt-5 flex gap-2">
            {socials.map(({ icon: I, label, href, color }) => (
              <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer" className={`grid h-9 w-9 place-items-center rounded-full text-white transition hover:scale-105 ${color}`}><I /></a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-muted">Secciones</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {cats?.map((c) => (
              <li key={c.id}><Link to="/categoria/$slug" params={{ slug: c.slug }} className="text-sm hover:text-primary">{c.name}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-4 py-5 text-xs text-navy-muted sm:px-6">
          <span>© 2026 QAP ChacoNews. Todos los derechos reservados.</span>
          <span>Desarrollado por Kento Terakawa</span>
        </div>
      </div>
    </footer>
  );
}
