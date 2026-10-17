export const OPENWEATHER_API_KEY = (import.meta.env.VITE_OPENWEATHER_API_KEY ?? "").trim();
export const OPENWEATHER_CITY = "Asuncion,PY";
export const OPENWEATHER_CITY_LABEL = "Asunción, PY";
export const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export type WeatherCurrent = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
};

export type ForecastDay = {
  day: string;
  icon: string;
  description: string;
  tempMin: number;
  tempMax: number;
};

type ForecastEntry = {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    temp_min?: number;
    temp_max?: number;
  };
  weather: Array<{
    icon: string;
    description: string;
  }>;
};

type ForecastResponse = {
  list?: ForecastEntry[];
};

function buildWeatherUrl(endpoint: string, params: URLSearchParams) {
  return `${OPENWEATHER_BASE_URL}${endpoint}?${params.toString()}`;
}

async function parseWeatherError(response: Response): Promise<Error> {
  if (response.status === 401) {
    return new Error(
      "La clave de OpenWeatherMap aún no está activa. OpenWeatherMap puede tardar 10 a 30 minutos en activarla; revisá VITE_OPENWEATHER_API_KEY.",
    );
  }

  if (response.status === 429) {
    return new Error("Se excedió el límite de peticiones de OpenWeatherMap. Intentalo más tarde.");
  }

  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return new Error(payload.message);
    }
  } catch {
    // Ignore JSON parsing issues and fall through to a generic error.
  }

  return new Error("No se pudo obtener la información del clima.");
}

export async function fetchCurrentWeather(): Promise<WeatherCurrent> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error("Falta la variable VITE_OPENWEATHER_API_KEY en el entorno.");
  }
  const params = new URLSearchParams({
    q: OPENWEATHER_CITY,
    units: "metric",
    lang: "es",
    appid: OPENWEATHER_API_KEY,
  });

  const response = await fetch(buildWeatherUrl("/weather", params));

  if (!response.ok) {
    throw await parseWeatherError(response);
  }

  const data = (await response.json()) as {
    name?: string;
    main?: { temp?: number; feels_like?: number; humidity?: number };
    wind?: { speed?: number };
    weather?: Array<{ description?: string; icon?: string }>;
  };

  if (typeof data.main?.temp !== "number") {
    throw new Error("La respuesta del clima no contiene datos válidos.");
  }

  return {
    city: data.name ?? OPENWEATHER_CITY_LABEL,
    temperature: data.main.temp,
    feelsLike: data.main.feels_like ?? data.main.temp,
    humidity: data.main.humidity ?? 0,
    windSpeed: data.wind?.speed ?? 0,
    description: data.weather?.[0]?.description ?? "Sin descripción",
    icon: data.weather?.[0]?.icon ?? "01d",
  };
}

export async function fetchForecastWeather(): Promise<ForecastDay[]> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error("Falta la variable VITE_OPENWEATHER_API_KEY en el entorno.");
  }

  const params = new URLSearchParams({
    q: OPENWEATHER_CITY,
    units: "metric",
    lang: "es",
    appid: OPENWEATHER_API_KEY,
  });

  const response = await fetch(buildWeatherUrl("/forecast", params));

  if (!response.ok) {
    throw await parseWeatherError(response);
  }

  const data = (await response.json()) as ForecastResponse;
  const list = data.list ?? [];

  if (list.length === 0) {
    throw new Error("El pronóstico no devolvió datos disponibles.");
  }

  const dayGroups = new Map<
    string,
    {
      day: string;
      temps: number[];
      sample: { icon: string; description: string };
      sampleDate: Date;
      sampleDistance: number;
    }
  >();

  for (const item of list) {
    const entryTime = new Date(item.dt * 1000);
    const dayKey = entryTime.toISOString().slice(0, 10);
    const hour = entryTime.getHours();
    const distanceFromNoon = Math.abs(hour - 12);
    const temp = item.main?.temp ?? 0;

    const current = dayGroups.get(dayKey);
    const icon = item.weather?.[0]?.icon ?? "01d";
    const description = item.weather?.[0]?.description ?? "Sin descripción";

    if (!current) {
      dayGroups.set(dayKey, {
        day: dayKey,
        temps: [temp],
        sample: { icon, description },
        sampleDate: entryTime,
        sampleDistance: distanceFromNoon,
      });
      continue;
    }

    current.temps.push(temp);

    if (distanceFromNoon < current.sampleDistance) {
      current.sample = { icon, description };
      current.sampleDate = entryTime;
      current.sampleDistance = distanceFromNoon;
    }
  }

  return Array.from(dayGroups.values())
    .slice(0, 5)
    .map((group) => {
      const date = new Date(group.sampleDate);
      const tempMin = Math.min(...group.temps);
      const tempMax = Math.max(...group.temps);

      return {
        day: date.toLocaleDateString("es-PY", { weekday: "short" }),
        icon: group.sample.icon,
        description: group.sample.description,
        tempMin,
        tempMax,
      };
    });
}
