import { Link } from "@tanstack/react-router";
import { useCategories } from "@/hooks/use-news";
import { Logo } from "./primitives";
import { socials } from "./SiteHeader";

export function SiteFooter() {
  const { data: cats } = useCategories();

  const sectionLinks = cats?.slice(0, 8) ?? [];
  const legalLinks = [
    { label: "Política de Cookies", href: "/cookies" },
    { label: "Términos y Condiciones", href: "/terminos-y-condiciones" },
    { label: "Política de Privacidad", href: "/politica-de-privacidad" },
    { label: "Aviso Legal", href: "/aviso-legal" },
    { label: "Quiénes Somos", href: "/quienes-somos" },
  ];

  return (
    <footer className="mt-20 border-t border-navy-border bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.1fr] lg:gap-16">
          <div className="max-w-xs">
            <Logo className="h-16" />
            <p className="mt-5 text-sm leading-6 text-navy-muted">
              El medio digital del Chaco paraguayo. Noticias de Filadelfia, Loma Plata,
              Mariscal Estigarribia y todo el país, las 24 horas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {socials.map(({ icon: I, label, href, color }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className={`grid h-9 w-9 place-items-center rounded-full text-white transition duration-200 hover:-translate-y-0.5 ${color}`}
                >
                  <I />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-navy-muted/80">
                Secciones
              </h3>
              <ul className="mt-5 space-y-3">
                {sectionLinks.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/categoria/$slug"
                      params={{ slug: c.slug }}
                      className="text-sm text-slate-100 transition hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-navy-muted/80">
                Información legal
              </h3>
              <ul className="mt-5 space-y-3">
                {legalLinks.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-slate-100 transition hover:text-primary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-navy-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-navy-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <span>© 2026 QAP ChacoNews. Todos los derechos reservados.</span>
          <span>Desarrollado por Kento Terakawa</span>
        </div>
      </div>
    </footer>
  );
}
