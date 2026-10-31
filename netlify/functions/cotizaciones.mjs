import axios from "axios";
import { load } from "cheerio";

const MAXICAMBIOS_URL = "https://www.maxicambios.com.py";
const MAXICAMBIOS_FALLBACK_URL = "https://maxicambios.com.py";
const MAXICAMBIOS_CACHE_MS = 20 * 60 * 1000;

const cachedRates = {};
let cacheTimestamp = 0;

const CODE_BY_LABEL = {
  dolar: "USD",
  euro: "EUR",
  real: "BRL",
  peso: "ARS",
};

const normalizeNumber = (value) => {
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

const getFlagCodeFromCard = (card) => {
  const src = card.find("img[src*='flags/']").first().attr("src") ?? "";
  const match = src.match(/(?:\/|\\)(USD|EUR|BRL|ARS|UYU|JPY|GBP|CLP|CHF|CAD|AUD|CNY)\.(?:png|jpg|jpeg|svg)/i);
  return match ? match[1].toUpperCase() : null;
};

function getRetailCashRoot($) {
  const preferredRoots = [
    $("#cotizacion-carousel").first(),
    $("#cotizacion-carousel-xs").first(),
    $("#monedas").first(),
    $(".cotizDivSmall").first().closest(".row"),
  ];

  const root = preferredRoots.find((node) => node && node.length > 0);
  return root ?? $;
}

const parseCurrencyCard = (card) => {
  const code = getFlagCodeFromCard(card);
  const labelText = card.find("p").last().text().trim();
  const detected = Object.entries(CODE_BY_LABEL).find(
    ([key]) => labelText.toLowerCase().includes(key) || (code && key === "peso" && code === "ARS"),
  );

  const resolvedCode = code ?? (detected ? detected[1] : null);
  if (!resolvedCode) return null;

  const numericValues = Array.from(card.text().matchAll(/\d+(?:[.,]\d+)?/g))
    .map((match) => normalizeNumber(match[0]))
    .filter((value) => value !== null);

  if (numericValues.length < 2) return null;

  return {
    code: resolvedCode,
    buy: numericValues[0],
    sell: numericValues[1],
  };
};

async function fetchPublicExchangeRates() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("La API pública de cotizaciones no respondió correctamente.");
  }

  const payload = await response.json();
  const rawRates = payload.rates ?? {};
  const normalized = {};
  const pygPerUsd = Number(rawRates.PYG);

  if (!Number.isFinite(pygPerUsd) || pygPerUsd <= 0) {
    throw new Error("La API pública no devolvió cotizaciones válidas.");
  }

  for (const [code, value] of Object.entries(rawRates)) {
    if (!["USD", "ARS", "BRL", "EUR", "UYU", "GBP", "JPY", "CAD", "AUD", "CHF", "CLP", "PYG"].includes(code)) continue;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) continue;

    normalized[code] = {
      buy: code === "PYG" ? 1 : pygPerUsd / numericValue,
      sell: code === "PYG" ? 1 : pygPerUsd / numericValue,
    };
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error("La API pública no devolvió cotizaciones válidas.");
  }

  return normalized;
}

async function fetchMaxicambiosRates() {
  const now = Date.now();

  if (Object.keys(cachedRates).length > 0 && now - cacheTimestamp < MAXICAMBIOS_CACHE_MS) {
    return cachedRates;
  }

  const candidateUrls = [MAXICAMBIOS_URL, MAXICAMBIOS_FALLBACK_URL];
  let response;
  let lastError = null;

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
  const nextRates = {};

  root.find(".cotizDivSmall").each((_, element) => {
    const item = parseCurrencyCard($(element));
    if (!item) return;
    nextRates[item.code] = { buy: item.buy, sell: item.sell };
  });

  if (Object.keys(nextRates).length === 0) {
    throw new Error("No se pudo leer ninguna cotización válida de Maxicambios.");
  }

  Object.assign(cachedRates, nextRates);
  cacheTimestamp = now;
  return cachedRates;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    let rates;
    try {
      rates = await fetchMaxicambiosRates();
    } catch (error) {
      rates = await fetchPublicExchangeRates();
    }

    return Response.json(
      {
        rates,
        updatedAt: new Date().toISOString(),
        source: "maxicambios.com.py",
      },
      {
        headers: {
          ...CORS_HEADERS,
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la cotización.";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
