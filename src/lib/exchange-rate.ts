import axios from "axios";
import { load } from "cheerio";

export const MAXICAMBIOS_URL = "https://www.maxicambios.com.py";
export const MAXICAMBIOS_FALLBACK_URL = "https://maxicambios.com.py";
export const MAXICAMBIOS_CACHE_MS = 20 * 60 * 1000;
const PUBLIC_EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/USD";
const PUBLIC_BASE_CODES = new Set(["USD", "ARS", "BRL", "EUR", "UYU", "GBP", "JPY", "CAD", "AUD", "CHF", "CLP", "PYG"]);

export type CurrencyPrice = {
  buy: number;
  sell: number;
};

export type ExchangeRateRecord = Record<string, CurrencyPrice>;

export type CurrencyListItem = {
  code: string;
  name: string;
  flag: string;
  flagClass: string;
};

const cachedRates: ExchangeRateRecord = {};
let cacheTimestamp = 0;

const CODE_BY_LABEL: Record<string, string> = {
  dolar: "USD",
  euro: "EUR",
  real: "BRL",
  peso: "ARS",
};

const normalizeNumber = (value: string): number | null => {
  const cleaned = value.replace(/\s+/g, "").replace(/[^0-9,\.]/g, "");

  if (!cleaned) return null;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number.parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (cleaned.includes(",")) {
    const [whole, fraction = "0"] = cleaned.split(",");
    const normalized = fraction.length <= 2 ? `${whole}.${fraction}` : `${whole}${fraction}`;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    const lastPart = parts.at(-1) ?? "";
    if (lastPart.length <= 2) {
      const parsed = Number.parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number.parseFloat(parts.join(""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

function getFlagCodeFromCard(card: ReturnType<typeof load> extends never ? never : any): string | null {
  const src = card.find("img[src*='flags/']").first().attr("src") ?? "";
  const match = src.match(/(?:\/|\\)(USD|EUR|BRL|ARS|UYU|JPY|GBP|CLP|CHF|CAD|AUD|CNY)\.(?:png|jpg|jpeg|svg)/i);
  return match ? match[1].toUpperCase() : null;
}

function getRetailCashRoot($: ReturnType<typeof load>) {
  const preferredRoots = [
    $("#cotizacion-carousel").first(),
    $("#cotizacion-carousel-xs").first(),
    $("#monedas").first(),
    $(".cotizDivSmall").first().closest(".row"),
  ];

  const root = preferredRoots.find((node) => node && node.length > 0);
  return root ?? $;
}

function parseCurrencyCard(card: ReturnType<typeof load> extends never ? never : any): { code: string; buy: number; sell: number } | null {
  const code = getFlagCodeFromCard(card);
  const labelText = card.find("p").last().text().trim();
  const detected = Object.entries(CODE_BY_LABEL).find(([key]) =>
    labelText.toLowerCase().includes(key) || (code && key === "peso" && code === "ARS"),
  );

  const resolvedCode = code ?? (detected ? detected[1] : null);
  if (!resolvedCode) return null;

  const numericValues = Array.from(card.text().matchAll(/\d+(?:[.,]\d+)?/g))
    .map((match) => normalizeNumber(match[0]))
    .filter((value): value is number => value !== null);

  if (numericValues.length < 2) return null;

  return {
    code: resolvedCode,
    buy: numericValues[0],
    sell: numericValues[1],
  };
}

async function fetchPublicExchangeRates(): Promise<ExchangeRateRecord> {
  const response = await fetch(PUBLIC_EXCHANGE_API_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("La API pública de cotizaciones no respondió correctamente.");
  }

  const payload = (await response.json()) as { rates?: Record<string, number> };
  const rawRates = payload.rates ?? {};
  const normalized: ExchangeRateRecord = {};

  for (const [code, value] of Object.entries(rawRates)) {
    if (!PUBLIC_BASE_CODES.has(code)) continue;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) continue;

    normalized[code] = {
      buy: numericValue,
      sell: numericValue,
    };
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("La API pública no devolvió cotizaciones válidas.");
  }

  return normalized;
}

export async function fetchMaxicambiosRates(): Promise<ExchangeRateRecord> {
  const now = Date.now();

  if (Object.keys(cachedRates).length > 0 && now - cacheTimestamp < MAXICAMBIOS_CACHE_MS) {
    return cachedRates;
  }

  const candidateUrls = [MAXICAMBIOS_URL, MAXICAMBIOS_FALLBACK_URL];

  try {
    let response;
    let lastError: unknown = null;

    for (const url of candidateUrls) {
      try {
        response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
          },
          timeout: 20000,
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      throw lastError instanceof Error ? lastError : new Error("No se pudo contactar a Maxicambios.");
    }

    const $ = load(response.data);
    const root = getRetailCashRoot($);
    const nextRates: ExchangeRateRecord = {};

    root.find(".cotizDivSmall").each((_, element) => {
      const item = parseCurrencyCard($(element));
      if (!item) return;

      nextRates[item.code] = {
        buy: item.buy,
        sell: item.sell,
      };
    });

    if (Object.keys(nextRates).length === 0) {
      throw new Error("No se pudo leer ninguna cotización válida de Maxicambios.");
    }

    Object.assign(cachedRates, nextRates);
    cacheTimestamp = now;

    return cachedRates;
  } catch (error) {
    if (Object.keys(cachedRates).length > 0) {
      return cachedRates;
    }

    try {
      const fallbackRates = await fetchPublicExchangeRates();
      Object.assign(cachedRates, fallbackRates);
      cacheTimestamp = Date.now();
      return cachedRates;
    } catch {
      const message = error instanceof Error ? error.message : "No se pudo cargar la cotización.";
      throw new Error(`No se pudo cargar la cotización: ${message}`);
    }
  }
}

export async function fetchExchangeRates(): Promise<ExchangeRateRecord> {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/cotizaciones", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      try {
        return await fetchPublicExchangeRates();
      } catch {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo cargar la cotización.");
      }
    }

    const payload = (await response.json()) as { rates?: ExchangeRateRecord };
    return payload.rates ?? {};
  }

  return fetchMaxicambiosRates();
}

export const CURRENCY_PREVIEW: CurrencyListItem[] = [
  { code: "USD", name: "Dólar", flag: "🇺🇸", flagClass: "fi fi-us" },
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷", flagClass: "fi fi-ar" },
  { code: "BRL", name: "Real", flag: "🇧🇷", flagClass: "fi fi-br" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", flagClass: "fi fi-eu" },
];

export const CURRENCY_MODAL_LIST: CurrencyListItem[] = [
  { code: "USD", name: "Dólar Estadounidense", flag: "🇺🇸", flagClass: "fi fi-us" },
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷", flagClass: "fi fi-ar" },
  { code: "BRL", name: "Real Brasileño", flag: "🇧🇷", flagClass: "fi fi-br" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", flagClass: "fi fi-eu" },
  { code: "UYU", name: "Peso Uruguayo", flag: "🇺🇾", flagClass: "fi fi-uy" },
  { code: "GBP", name: "Libra Esterlina", flag: "🇬🇧", flagClass: "fi fi-gb" },
  { code: "JPY", name: "Yen Japonés", flag: "🇯🇵", flagClass: "fi fi-jp" },
  { code: "CAD", name: "Dólar Canadiense", flag: "🇨🇦", flagClass: "fi fi-ca" },
  { code: "AUD", name: "Dólar Australiano", flag: "🇦🇺", flagClass: "fi fi-au" },
  { code: "CHF", name: "Franco Suizo", flag: "🇨🇭", flagClass: "fi fi-ch" },
  { code: "CLP", name: "Peso Chileno", flag: "🇨🇱", flagClass: "fi fi-cl" },
];
