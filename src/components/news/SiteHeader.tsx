import { Link, useNavigate } from "@tanstack/react-router";
import { User, Menu, Moon, Search, Sun, CloudSun, MapPin } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCategories } from "@/hooks/use-news";
import { Logo } from "./primitives";
import { Ticker } from "./Ticker";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchCurrentWeather,
  fetchForecastWeather,
  type ForecastDay,
  type WeatherCurrent,
} from "@/lib/weather";
import {
  CURRENCY_MODAL_LIST,
  CURRENCY_PREVIEW,
  fetchExchangeRates,
} from "@/lib/exchange-rate";

function AuthControl() {
  const { user, loading, openAuthDialog } = useAuth();
  if (loading)
    return <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-secondary" />;
  if (user) return <UserMenu />;
  return (
    <>
      <Button
        onClick={() => openAuthDialog("login")}
        className="hidden h-10 rounded-full px-5 font-bold sm:inline-flex"
      >
        Iniciar sesión
      </Button>
      <button
        onClick={() => openAuthDialog("login")}
        aria-label="Iniciar sesión"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sm:hidden"
      >
        <User className="h-4 w-4" />
      </button>
    </>
  );
}

function DrawerAuth() {
  const { user, openAuthDialog } = useAuth();
  if (user) return null;
  return (
    <SheetClose asChild>
      <Button
        onClick={() => openAuthDialog("login")}
        className="mt-6 h-11 w-full rounded-full font-bold"
      >
        Iniciar sesión
      </Button>
    </SheetClose>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V7.2c0-.9.3-1.5 1.6-1.5H17V2.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2V11H8v3.1h2.6v8h2.9Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M18.9 2h3.7l-8.1 9.2L22.8 22h-7.3l-5.7-8.1L4 22H.3l8.7-9.9L1.2 2h7.4l5.2 7.4L18.9 2Zm-1.3 18.1h2L7.2 3.8H4.9l12.7 16.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 2.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 6.5A5.5 5.5 0 1 1 12 17.5 5.5 5.5 0 0 1 12 6.5Zm0 2A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M21.6 7.2a2.9 2.9 0 0 0-2-2.1C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.4A2.9 2.9 0 0 0 2.4 7.2 30.5 30.5 0 0 0 2 12a30.5 30.5 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2.1c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.9 2.9 0 0 0 2-2.1A30.5 30.5 0 0 0 22 12a30.5 30.5 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
    </svg>
  );
}

export const socials = [
  { icon: FacebookIcon, label: "Facebook", href: "https://facebook.com", color: "bg-[#1877F2]" },
  { icon: XIcon, label: "X", href: "https://x.com", color: "bg-[#0F172A]" },
  { icon: InstagramIcon, label: "Instagram", href: "https://instagram.com", color: "bg-gradient-to-br from-[#F9CE34] via-[#EE2A7B] to-[#6228D7]" },
  { icon: YouTubeIcon, label: "YouTube", href: "https://youtube.com", color: "bg-[#FF0000]" },
];

function useToday() {
  const [d, setD] = useState("");
  useEffect(() => {
    const s = new Date().toLocaleDateString("es-PY", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setD(s.charAt(0).toUpperCase() + s.slice(1));
  }, []);
  return d;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme") === "dark";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary transition hover:bg-accent"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function formatPyg(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CountryFlag({
  className,
  label,
  size = "sm",
}: {
  className: string;
  label: string;
  size?: "sm" | "lg";
}) {
  const dimension = size === "lg" ? "1.75rem" : "1.1rem";

  return (
    <span
      className={`fi ${className} inline-block rounded-[4px] border border-white/20 bg-cover bg-center shadow-sm`}
      aria-label={label}
      title={label}
      style={{ width: dimension, height: dimension }}
    />
  );
}

export function CurrencyTicker({ className = "" }: { className?: string }) {
  const [rates, setRates] = useState<Record<string, { buy: number; sell: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRates = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchExchangeRates();
        if (!isMounted) return;
        setRates(result);
      } catch (catchError) {
        if (!isMounted) return;
        setError(catchError instanceof Error ? catchError.message : "No se pudo cargar la cotización.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || CURRENCY_PREVIEW.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % CURRENCY_PREVIEW.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const current = CURRENCY_PREVIEW[activeIndex];
  const currentRate = rates[current.code];
  const currentValue = currentRate ? currentRate.sell : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver cotización de monedas"
        className={`group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-left text-[10px] text-navy-foreground transition-all duration-300 hover:border-white/20 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/80 sm:gap-2.5 sm:px-3 sm:py-2 sm:text-xs ${className}`}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white/20" />
            <span className="font-medium text-foreground">Cotización…</span>
          </span>
        ) : error ? (
          <span className="flex items-center gap-2 text-amber-200">
            <span className="text-base">💱</span>
            <span className="font-medium">Monedas</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-navy-foreground transition-all duration-500">
            <CountryFlag className={current.flagClass} label={current.name} />
            <span className="font-semibold">{current.code}</span>
            <span className="font-medium text-primary">₲ {formatPyg(currentValue)}</span>
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-[28px] border-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),_var(--background)] p-0 shadow-[0_20px_80px_rgba(15,23,42,0.28)] sm:w-full">
          <div className="flex items-center justify-between border-b border-border/70 bg-card/80 px-5 py-4 backdrop-blur-sm">
            <DialogHeader className="space-y-1 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
                Monedas
              </div>
              <DialogTitle className="text-xl font-bold">Cotización en PYG</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Valor de cada moneda frente al guaraní.
              </DialogDescription>
            </DialogHeader>

            <DialogClose asChild>
              <button
                type="button"
                aria-label="Cerrar cotizaciones"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                ×
              </button>
            </DialogClose>
          </div>

          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {CURRENCY_MODAL_LIST.map((currency) => {
              const rate = rates[currency.code];

              return (
                <div
                  key={currency.code}
                  className="rounded-2xl border border-border/70 bg-gradient-to-r from-secondary/80 to-background/90 px-3 py-3 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/60 shadow-inner ring-1 ring-black/5 dark:bg-slate-900/50 dark:ring-white/5">
                        <CountryFlag className={currency.flagClass} label={currency.name} size="lg" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{currency.code}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{currency.name}</p>
                      </div>
                    </div>
                  </div>

                  {rate ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-2 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                          Compra
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">₲ {formatPyg(rate.buy)}</p>
                      </div>
                      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-2.5 py-2 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                          Venta
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">₲ {formatPyg(rate.sell)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-2 py-2 text-sm text-muted-foreground">
                      Sin datos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WeatherIcon({
  icon,
  description,
  size = "md",
}: {
  icon: string;
  description: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="grid place-items-center rounded-full bg-slate-900/90 ring-1 ring-white/10 shadow-sm backdrop-blur-sm">
      <img
        src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
        alt={description}
        className={`${sizeClasses[size]} object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]`}
        style={{ filter: "brightness(1.15) contrast(1.15)" }}
      />
    </div>
  );
}

function WeatherSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex animate-pulse items-center gap-2 ${className}`}>
      <span className="h-4 w-4 rounded-full bg-white/20" />
      <span className="h-3 w-12 rounded-full bg-white/20" />
    </div>
  );
}

function WeatherQuickView({ onOpen }: { onOpen: () => void }) {
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const current = await fetchCurrentWeather();
        if (!active) return;
        setWeather(current);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Sin datos");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadWeather();
    return () => {
      active = false;
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Ver pronóstico del clima"
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900 px-2.5 py-1.5 text-left text-[10px] text-white shadow-sm ring-1 ring-white/10 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/80 sm:gap-2.5 sm:px-3 sm:py-2 sm:text-xs"
    >
      {loading ? (
        <WeatherSkeleton />
      ) : weather?.icon ? (
        <div className="grid place-items-center rounded-full bg-white/10 p-1 ring-1 ring-white/15">
          <img
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.description}
            className="h-6 w-6 object-contain sm:h-7 sm:w-7"
            style={{ filter: "brightness(1.15) contrast(1.15)" }}
          />
        </div>
      ) : (
        <CloudSun className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
      )}

      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
        <MapPin className="h-3 w-3 opacity-80 sm:h-3.5 sm:w-3.5" />
        <span>{error ? "Clima" : `${Math.round(weather?.temperature ?? 0)}°C`}</span>
      </span>
    </button>
  );
}

function WeatherForecastModal() {
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [current, nextDays] = await Promise.all([
          fetchCurrentWeather(),
          fetchForecastWeather(),
        ]);
        if (!active) return;
        setWeather(current);
        setForecast(nextDays);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No pudimos cargar el clima.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetails();
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <WeatherQuickView onOpen={() => setOpen(true)} />
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.25rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-background p-0 shadow-2xl sm:w-full">
        <div className="border-b p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-bold">Clima en Asunción</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Pronóstico detallado para hoy y los próximos días.
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-2xl border bg-secondary/60 p-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl border bg-secondary/60" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between rounded-2xl border bg-secondary/60 p-4">
              <div className="flex items-center gap-3">
                {weather?.icon ? (
                  <WeatherIcon icon={weather.icon} description={weather.description} size="lg" />
                ) : (
                  <CloudSun className="h-10 w-10 text-primary" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Ahora</p>
                  <p className="text-3xl font-bold">
                    {weather ? `${Math.round(weather.temperature)}°C` : "--°"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  {weather?.description ?? "Sin descripción"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sensación térmica {weather ? `${Math.round(weather.feelsLike)}°C` : "--°"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Humedad</p>
                <p className="mt-2 text-xl font-semibold">{weather?.humidity ?? 0}%</p>
              </div>
              <div className="rounded-2xl border bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Viento</p>
                <p className="mt-2 text-xl font-semibold">{weather?.windSpeed ?? 0} km/h</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-secondary/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">Pronóstico de 5 días</h3>
                <span className="text-xs text-muted-foreground">Muestra diaria</span>
              </div>

              <div className="space-y-2">
                {forecast.map((day) => (
                  <div key={`${day.day}-${day.icon}`} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
                    <div className="w-20 shrink-0 text-sm font-medium text-foreground">{day.day}</div>
                    <WeatherIcon icon={day.icon} description={day.description} size="sm" />
                    <div className="min-w-0 flex-1 text-sm text-muted-foreground">{day.description}</div>
                    <div className="shrink-0 text-sm font-semibold">
                      {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t p-4">
          <span className="text-xs text-muted-foreground">{weather?.city ?? "Asunción, PY"}</span>
          <DialogClose asChild>
            <button type="button" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/80">
              Cerrar
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/buscar", search: { q: q.trim() } });
  };
  return (
    <form onSubmit={submit} role="search" className={className}>
      <label className="relative block">
        <span className="sr-only">Buscar noticias</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 100))}
          placeholder="Buscar en QAP ChacoNews…"
          className="h-11 w-full rounded-full border bg-secondary pl-5 pr-11 text-sm outline-none transition focus:border-primary focus:bg-card"
        />
        <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </label>
    </form>
  );
}

export function SiteHeader() {
  const today = useToday();
  const { data: cats } = useCategories();

  return (
    <>
      <div className="hidden bg-navy text-navy-foreground md:flex">
        <div className="mx-auto flex h-auto min-h-10 max-w-7xl flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
          <span className="shrink-0 text-[11px] text-navy-muted sm:text-xs">{today}</span>
          <div className="min-w-0 flex-1">
            <Ticker />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <CurrencyTicker />
            {socials.map(({ icon: I, label, href, color }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
                className={`grid h-8 w-8 place-items-center rounded-full text-white transition hover:scale-105 ${color}`}
              >
                <I />
              </a>
            ))}
          </div>
        </div>
      </div>

      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="hidden md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                aria-label="QAP ChacoNews, inicio"
                className="inline-flex rounded-xl bg-navy px-3 py-1.5"
              >
                <Logo className="h-9" />
              </Link>
            </div>

            <SearchBox className="mx-auto w-full max-w-md" />

            <div className="flex items-center justify-end gap-2">
              <WeatherForecastModal />
              <ThemeToggle />
              <AuthControl />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 md:hidden">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger
                  aria-label="Abrir menú"
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
                >
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-navy text-navy-foreground">
                  <SheetTitle className="sr-only">Menú</SheetTitle>
                  <Logo className="h-12" />
                  <DrawerAuth />
                  <SearchBox className="mt-6 text-foreground" />
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-muted">
                      Acciones rápidas
                    </p>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 p-2">
                      <CurrencyTicker />
                    </div>
                    <div className="mt-3 flex items-center gap-3 pt-1">
                      {socials.map(({ icon: I, label, href, color }) => (
                        <a
                          key={label}
                          href={href}
                          aria-label={label}
                          target="_blank"
                          rel="noreferrer"
                          className={`grid h-9 w-9 place-items-center rounded-full text-white transition hover:scale-105 ${color}`}
                        >
                          <I />
                        </a>
                      ))}
                    </div>
                  </div>
                  <nav className="mt-6 flex flex-col gap-1">
                    <Link to="/" className="rounded-xl px-3 py-2.5 font-semibold hover:bg-navy-border">
                      Inicio
                    </Link>
                    {cats?.map((c) => (
                      <Link
                        key={c.id}
                        to="/categoria/$slug"
                        params={{ slug: c.slug }}
                        className="rounded-xl px-3 py-2.5 font-semibold hover:bg-navy-border"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-1 justify-start">
              <Link to="/" aria-label="QAP ChacoNews, inicio" className="inline-flex">
                <Logo className="h-9" />
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <AuthControl />
            </div>
          </div>
        </div>

        <nav
          aria-label="Categorías"
          className="mx-auto hidden max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:flex"
        >
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
          >
            Inicio
          </Link>
          {cats?.map((c) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
