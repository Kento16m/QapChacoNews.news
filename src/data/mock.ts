import type { Article, Category, Tag } from "@/types";

export const categories: Category[] = [
  { id: "c1", name: "Chaco", slug: "chaco", color: "#D7191F", sort_order: 1 },
  { id: "c2", name: "Paraguay", slug: "paraguay", color: "#2563EB", sort_order: 2 },
  { id: "c3", name: "Política", slug: "politica", color: "#7C3AED", sort_order: 3 },
  { id: "c4", name: "Economía", slug: "economia", color: "#059669", sort_order: 4 },
  { id: "c5", name: "Deportes", slug: "deportes", color: "#EA580C", sort_order: 5 },
  { id: "c6", name: "Policiales", slug: "policiales", color: "#0F172A", sort_order: 6 },
  { id: "c7", name: "Mundo", slug: "mundo", color: "#0891B2", sort_order: 7 },
  { id: "c8", name: "Tecnología", slug: "tecnologia", color: "#4F46E5", sort_order: 8 },
  { id: "c9", name: "Espectáculos", slug: "espectaculos", color: "#DB2777", sort_order: 9 },
];

export const tags: Tag[] = [
  { id: "t1", name: "Transchaco", slug: "transchaco" },
  { id: "t2", name: "Ganadería", slug: "ganaderia" },
  { id: "t3", name: "Filadelfia", slug: "filadelfia" },
  { id: "t4", name: "Clima", slug: "clima" },
  { id: "t5", name: "Corredor Bioceánico", slug: "corredor-bioceanico" },
];

const cat = (slug: string) => categories.find((c) => c.slug === slug) ?? null;
const tag = (...slugs: string[]) => tags.filter((t) => slugs.includes(t.slug));
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=75`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const authors = [
  { full_name: "María Giesbrecht", avatar_url: null },
  { full_name: "Óscar Benítez", avatar_url: null },
  { full_name: "Lucía Fernández", avatar_url: null },
];

type Seed = [string, string, string, string | null, string[], number, number, Partial<Article>?];

const seeds: Seed[] = [
  ["Avanza el Corredor Bioceánico: el tramo Carmelo Peralta–Loma Plata supera el 80%", "chaco", "Las obras del Corredor Bioceánico entran en su etapa final y prometen transformar la logística del Chaco.", img("photo-1500382017468-9049fed747ef"), ["corredor-bioceanico", "transchaco"], 1, 18420, { is_featured: true }],
  ["Filadelfia celebra su aniversario con una feria récord de productores", "chaco", "Más de 300 expositores participaron en la tradicional feria de la capital de Boquerón.", img("photo-1488459716781-31db52582fe9"), ["filadelfia"], 2, 9120],
  ["Ganaderos chaqueños reportan buenos precios en la exportación de carne", "economia", "La demanda internacional mantiene firme la cotización del novillo en las ferias de Loma Plata.", img("photo-1500595046743-cd271d694d30"), ["ganaderia"], 3, 12030],
  ["Ola de calor: el Chaco registra 44 °C y piden extremar cuidados", "chaco", "La Dirección de Meteorología emitió alerta naranja para Boquerón y Alto Paraguay.", img("photo-1504370805625-d32c54b16100"), ["clima"], 1.5, 15800, { is_breaking: true }],
  ["Habilitan nuevo tramo asfaltado de la Ruta Transchaco en Mariscal Estigarribia", "paraguay", "El MOPC entregó 32 kilómetros rehabilitados que reducen el tiempo de viaje.", img("photo-1469854523086-cc02fe5d8800"), ["transchaco"], 5, 7300, { is_breaking: true }],
  ["Senado debate presupuesto para infraestructura en la región Occidental", "politica", "Legisladores del Chaco piden mayor inversión en caminos vecinales y agua potable.", null, [], 6, 4200],
  ["Cerro Porteño y Olimpia empatan en un clásico vibrante", "deportes", "El superclásico terminó 2-2 con goles en los minutos finales.", img("photo-1574629810360-7efbbe195018"), [], 4, 21000, { is_breaking: true }],
  ["Policía desarticula banda de abigeato en Boquerón", "policiales", "Recuperaron más de 120 cabezas de ganado en un operativo conjunto.", img("photo-1453873531674-2151bcd01707"), ["ganaderia"], 7, 8800],
  ["Mercosur y la UE avanzan en la ratificación del acuerdo comercial", "mundo", "Paraguay espera beneficios directos para el sector agroexportador.", img("photo-1526304640581-d334cdbbf45e"), [], 9, 3900],
  ["Llega la fibra óptica a comunidades del Chaco Central", "tecnologia", "Un proyecto público-privado conectará a 15 localidades antes de fin de año.", img("photo-1558494949-ef010cbdcc31"), [], 10, 5100],
  ["Festival del Chaco reúne a artistas nacionales en Loma Plata", "espectaculos", "Polcas, chamamé y rock local animaron una noche a cielo abierto.", img("photo-1470229722913-7c0e2dbbafd3"), [], 12, 6400],
  ["Cooperativas menonitas impulsan producción lechera récord", "economia", "La producción diaria superó los 1,2 millones de litros en el Chaco Central.", img("photo-1516467508483-a7212febe31a"), ["ganaderia"], 14, 6900],
  ["Comunidades indígenas del Chaco reciben kits de agua potable", "chaco", "Cisternas y filtros llegan a 40 comunidades afectadas por la sequía.", img("photo-1541544537156-7627a7a4aa1c"), ["clima"], 16, 4700],
  ["Albirroja convoca a dos jugadores chaqueños para las eliminatorias", "deportes", "El seleccionador incluyó a juveniles formados en clubes de Filadelfia.", img("photo-1431324155629-1a6deb1dec8d"), ["filadelfia"], 18, 11200],
  ["Gobierno anuncia plan de viviendas para el Departamento de Presidente Hayes", "paraguay", "Se construirán 1.500 unidades habitacionales en los próximos dos años.", img("photo-1560518883-ce09059eeffa"), [], 20, 3100],
];

const fig = (id: string, cap: string) =>
  `<figure><img src="${img(id)}" alt="${cap}" loading="lazy" /><figcaption>${cap}</figcaption></figure>`;

const longContents: Record<number, string> = {
  0: `<p>Las obras del Corredor Bioceánico avanzan a paso firme en el Chaco paraguayo. El tramo que une Carmelo Peralta con Loma Plata ya supera el 80% de ejecución, según el último informe técnico del Ministerio de Obras Públicas y Comunicaciones, y las cuadrillas trabajan en dos turnos para cumplir con el cronograma previsto.</p>
<p>La ruta, que forma parte de un eje de más de 2.200 kilómetros entre el puerto brasileño de Santos y los puertos chilenos del Pacífico, promete reducir drásticamente los costos logísticos para los productores de la región Occidental.</p>
<h2>Un cambio de escala para la producción chaqueña</h2>
<p>Ganaderos, cooperativas y empresas lácteas del Chaco Central coinciden en que el corredor abrirá mercados que hasta ahora resultaban inalcanzables por la distancia y el estado de los caminos. "Hoy un camión tarda casi el doble en llegar a la frontera; con la ruta terminada, eso cambia por completo", explicó un dirigente gremial de Loma Plata.</p>
<blockquote>"El corredor no es solo una ruta: es la puerta del Chaco al mundo."</blockquote>
<p>Entre los beneficios que destacan los técnicos se encuentran:</p>
<ul><li>Reducción de hasta 40% en el tiempo de traslado de mercaderías.</li><li>Nuevas oportunidades para el turismo en Alto Paraguay.</li><li>Mayor conectividad para comunidades indígenas y rurales.</li></ul>
${fig("photo-1469854523086-cc02fe5d8800", "Tramo asfaltado del Corredor Bioceánico en las cercanías de Loma Plata.")}
<h2>Los desafíos pendientes</h2>
<p>A pesar del avance, persisten desafíos vinculados al mantenimiento, la señalización y la construcción del puente internacional sobre el río Paraguay, que conectará Carmelo Peralta con Porto Murtinho.</p>
<p>Las autoridades estiman que el tramo completo podría habilitarse a mediados del próximo año, siempre que las condiciones climáticas acompañen.</p>`,
  1: `<p>Filadelfia vivió un fin de semana a pura fiesta. La capital del departamento de Boquerón celebró su aniversario con una feria que reunió a más de 300 expositores y miles de visitantes llegados de todo el país.</p>
<p>Productores de miel, artesanos indígenas, emprendedores gastronómicos y cooperativas ocuparon los pabellones desde temprano, mientras las familias recorrían los stands bajo un sol intenso.</p>
<h2>Una vidriera para el emprendimiento local</h2>
<p>Los organizadores destacaron que esta edición batió récords tanto en participación como en ventas. "Cada año crece más, y eso demuestra la fuerza productiva del Chaco", señaló uno de los responsables de la feria.</p>
<blockquote>"Aquí se ve el trabajo de generaciones que apostaron por esta tierra."</blockquote>
<ul><li>Más de 300 expositores.</li><li>Ventas estimadas por encima de los 2.000 millones de guaraníes.</li><li>Espectáculos artísticos durante las tres jornadas.</li></ul>
${fig("photo-1488459716781-31db52582fe9", "Productos frescos en uno de los pabellones de la feria.")}
<h2>Cultura y tradición</h2>
<p>La agenda cultural incluyó presentaciones de coros, danzas tradicionales y muestras de las distintas comunidades que conviven en el Chaco Central.</p>
<p>La municipalidad ya anunció que la próxima edición contará con un predio ampliado.</p>`,
  2: `<p>Los ganaderos del Chaco paraguayo atraviesan un buen momento. La demanda internacional de carne vacuna mantiene firmes las cotizaciones del novillo en las ferias de Loma Plata y Filadelfia, con precios que superan los registrados el año pasado.</p>
<p>Los principales destinos de exportación siguen siendo Chile, Taiwán e Israel, aunque el sector apuesta a consolidar nuevos mercados en Asia.</p>
<h2>Precios firmes y mayor demanda</h2>
<p>Según datos de los frigoríficos, el valor por kilo en pie mostró una suba sostenida durante las últimas semanas. Los productores atribuyen el fenómeno a la menor oferta regional y a la buena reputación sanitaria del país.</p>
<blockquote>"La carne del Chaco tiene una calidad reconocida en todo el mundo."</blockquote>
<ul><li>Suba promedio del 8% en el precio del novillo.</li><li>Más de 20 mercados habilitados.</li><li>Inversión creciente en genética y pasturas.</li></ul>
${fig("photo-1500595046743-cd271d694d30", "Ganado en una estancia del Chaco Central.")}
<h2>Mirando al futuro</h2>
<p>El desafío para los próximos años será mejorar la infraestructura vial y el acceso al agua, dos factores clave para sostener la productividad.</p>
<p>El Corredor Bioceánico aparece, una vez más, como la gran esperanza del sector.</p>`,
};

const genericContent = (excerpt: string) => `<p>${excerpt} La información fue confirmada por fuentes oficiales consultadas por QAP ChacoNews, que siguen de cerca la evolución de los hechos.</p>
<p>Vecinos y referentes de la zona destacaron la importancia del tema para el desarrollo de la región, y pidieron que las autoridades mantengan el seguimiento en los próximos meses.</p>
<h2>Lo que se sabe hasta ahora</h2>
<p>Los detalles se irán actualizando a medida que se conozcan nuevos datos. Por el momento, los responsables aseguran que se trabaja para dar respuesta a todas las inquietudes.</p>
<blockquote>"Es un paso importante para toda la comunidad."</blockquote>
<ul><li>Seguimiento permanente de las autoridades.</li><li>Participación de la comunidad local.</li><li>Nuevas actualizaciones en los próximos días.</li></ul>
<h2>Próximos pasos</h2>
<p>QAP ChacoNews continuará informando sobre esta noticia con toda la cobertura desde el Chaco paraguayo.</p>`;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const articles: Article[] = seeds.map(([title, c, excerpt, cover, t, h, views, extra], i) => ({
  id: `a${i + 1}`,
  title,
  slug: slugify(title),
  subtitle: excerpt,
  excerpt,
  content: longContents[i] ?? genericContent(excerpt),
  cover_image_url: cover,
  category: cat(c),
  author: authors[i % authors.length] ?? null,
  tags: tag(...t),
  is_featured: false,
  is_breaking: false,
  reading_time_minutes: 3 + (i % 5),
  seo_title: title,
  seo_description: excerpt,
  views_count: views,
  published_at: hoursAgo(h),
  ...extra,
}));
