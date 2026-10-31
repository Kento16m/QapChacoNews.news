import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { load } from "cheerio";

const MAXICAMBIOS_URLS = ["https://www.maxicambios.com.py", "https://maxicambios.com.py"];
const OUTPUT_PATH = path.resolve(process.cwd(), "public", "cotizaciones.json");

const CODE_BY_LABEL = {
  dolar: "USD",
  euro: "EUR",
  real: "BRL",
  peso: "ARS",
};

const normalizeNumber = (value) => {
  const cleaned = String(value).replace(/\s+/g, "").replace(/[^0-9,\.]/g, "");
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

function getFlagCodeFromCard(card) {
  const src = card.find("img[src*='flags/']").first().attr("src") ?? "";
  const match = src.match(/(?:\/|\\)(USD|EUR|BRL|ARS|UYU|JPY|GBP|CLP|CHF|CAD|AUD|CNY)\.(?:png|jpg|jpeg|svg)/i);
  return match ? match[1].toUpperCase() : null;
}

function getRetailCashRoot($) {
  const preferredRoots = [
    $("#cotizacion-carousel").first(),
    $("#cotizacion-carousel-xs").first(),
    $("#monedas").first(),
    $(".cotizDivSmall").first().closest(".row"),
  ];

  return preferredRoots.find((node) => node && node.length > 0) ?? $;
}

function parseCurrencyCard(card) {
  const code = getFlagCodeFromCard(card);
  const labelText = card.find("p").last().text().trim();
  const detected = Object.entries(CODE_BY_LABEL).find(([key]) =>
    labelText.toLowerCase().includes(key) || (code && key === "peso" && code === "ARS"),
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
}

async function fetchMaxicambiosRates() {
  let response;
  let lastError;

  for (const url of MAXICAMBIOS_URLS) {
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

  return nextRates;
}

try {
  const rates = await fetchMaxicambiosRates();
  const payload = {
    rates,
    updatedAt: new Date().toISOString(),
    source: "maxicambios.com.py",
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Cotizaciones guardadas en ${OUTPUT_PATH}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "No se pudo generar el archivo de cotizaciones.";
  console.error(message);
  process.exit(1);
}
