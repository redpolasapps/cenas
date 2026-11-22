// Expande el plan diario que escribe Claude (plan/AAAA-MM-DD.json) en recetas completas.
// - Gemini escribe ingredientes y pasos detallados (lo "pesado").
// - Pexels (si hay clave) o Wikimedia Commons pone una foto real con licencia libre.
// - Escribe data.js y actualiza recetas/historial.json.
// Lo ejecuta GitHub Actions (.github/workflows/expandir.yml). Sin dependencias: Node 20+.
//
// Variables de entorno:
//   GEMINI_API_KEY   (obligatoria)  clave de Google AI Studio, guardada como secreto en GitHub
//   PEXELS_API_KEY   (opcional)     clave gratuita de pexels.com/api; sin ella se usa Wikimedia Commons (sin clave)
//   GEMINI_MODEL     (opcional)     forzar un modelo; si no, se eligen los flash disponibles (ver gemini.mjs)
//   PLAN             (opcional)     ruta del plan; por defecto, el más reciente de plan/
//   MOCK_GEMINI      (solo pruebas) archivo JSON con una respuesta simulada de Gemini

import { llamarGemini as llamar } from "./gemini.mjs";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ICONOS = ["cortar", "sarten", "horno", "olla", "mezclar", "emplatar", "envolver", "lavar", "airfryer", "micro"];
const FUEGOS = ["suave", "medio", "fuerte"];

const log = (...a) => console.log("[expandir]", ...a);

// Lo propio de cada familia (ciudad, edad del peque, gustos, alergias) está en familia.json
export const FAMILIA = await (async () => { try { return JSON.parse(await readFile(path.join(RAIZ, "familia.json"), "utf8")); } catch { return {}; } })();
const EDAD = FAMILIA.edad || 4, ZONA = FAMILIA.zona || "Europe/Madrid";
const ALERGIAS = String(FAMILIA.alergias || "").trim();

/* ---------------- utilidades ---------------- */
async function leerJSON(rel, defecto) {
  try { return JSON.parse(await readFile(path.join(RAIZ, rel), "utf8")); } catch { return defecto; }
}
async function leerData() {
  try {
    const code = await readFile(path.join(RAIZ, "data.js"), "utf8");
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(code, ctx);
    return ctx.window.MENU_DATA || null;
  } catch { return null; }
}
function ahoraMadrid() {
  const d = new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const off = (p.timeZoneName || "GMT+01:00").replace("GMT", "") || "+00:00";
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${off}`;
}
function diaSemana(fecha) {
  const d = new Date(fecha + "T12:00:00Z").getUTCDay();
  return d === 6 ? "Sábado" : d === 0 ? "Domingo" : "Entre semana";
}

/* ---------------- Gemini ---------------- */
const REGLAS = `Eres un redactor de recetas de cocina casera española para una familia con un niño de ${EDAD} años.
Te paso una lista de recetas YA DECIDIDAS (título, tipo de cocina, raciones, tiempo y una guía). NO cambies el plato ni lo que dice la guía: solo escribe sus ingredientes y sus pasos.

Para cada receta devuelve:
- "ingredientes": lista completa, un ingrediente por elemento, con cantidades concretas en gramos, mililitros o unidades claras ("400 g de merluza sin espinas", "2 cucharadas de aceite de oliva", "1 cebolla mediana (150 g)"). Para el número de raciones indicado.
- "pasos": entre 6 y 12 pasos, escritos para alguien que casi NO sabe cocinar. Uno por acción. Cada paso es un objeto con:
  - "texto": 1 a 3 frases claras que explican CÓMO hacerlo: tamaño del corte, recipiente, cantidad de aceite, cuándo añadir cada cosa. Si usas un término de cocina, explícalo ("pochar: cocinar a fuego suave hasta que esté blandita y transparente").
  - "usa": lista con los ingredientes y cantidades EXACTAS que se usan en ese paso. Si el paso no usa ingredientes, lista vacía.
  - "icono": uno de: cortar, sarten, horno, olla, mezclar, emplatar, envolver, lavar, airfryer (pasos en la freidora de aire), micro (pasos en el microondas).
  - "fuego": "suave", "medio" o "fuerte" solo si el paso es en el fuego. Si es en el horno, indica en el texto la temperatura y el modo (arriba y abajo).
  - "min": minutos del paso si los tiene (número), si no omítelo.
  - "consejo": opcional, una aclaración útil: cómo saber que está hecho (color, textura, que el cuchillo entre fácil), qué hacer si algo sale mal o un aviso de seguridad.
  El primer paso suele ser preparar (precalentar el horno, poner agua a hervir, sacar ingredientes). El último, emplatar, incluida la versión para el niño si la guía o el truco la mencionan.
${ALERGIAS ? `- ALERGIAS E INTOLERANCIAS DE LA FAMILIA (OBLIGATORIO, ni rastro en ingredientes ni pasos): ${ALERGIAS}.\n` : ""}- Seguridad para el niño de ${EDAD} años: sin picante, poca sal, pescado sin espinas, carne sin huesecillos, nada de frutos secos enteros ni uvas o tomates cherry enteros.
- Si una receta tiene "airfryer": true, se cocina toda o casi toda en la freidora de aire (air fryer): en sus pasos indica temperatura (°C), minutos, si hay que precalentarla, cuánto aceite (spray o una cucharadita), no llenar demasiado la cesta y cuándo darle la vuelta o sacudirla. Usa el icono "airfryer" en esos pasos.
- Si una receta tiene "rapida": true, es una cena SÚPER RÁPIDA para una noche de mucho cansancio: lista en 10–15 minutos, como mucho 5 pasos muy cortos, con productos ya preparados del súper (caldo envasado, verdura de bolsa para microondas, legumbre cocida de bote, huevos, pollo asado, pan integral, conservas de pescado…). Nombra el tipo de producto de forma genérica, sin marcas.
- Los ingredientes de la lista tienen que cuadrar con lo que se usa en los pasos.

Responde SOLO con JSON con esta forma: {"recetas":[{"id":"...","ingredientes":[...],"pasos":[...]}]}, una entrada por cada receta, con el mismo "id".`;

// Todo el trabajo con Gemini tiene un límite global (la Action se corta a los 24 min)
const LIMITE = Date.now() + Number(process.env.LIMITE_MIN || 19) * 60000;
export async function llamarGemini(prompt, opciones = {}) {
  if (process.env.MOCK_GEMINI) { // pruebas: lista de archivos separados por comas, uno por llamada
    const l = process.env.MOCK_GEMINI.split(","); const f = l.length > 1 ? l.shift() : l[0]; process.env.MOCK_GEMINI = l.join(",");
    return JSON.parse(await readFile(f, "utf8"));
  }
  const queda = LIMITE - Date.now();
  if (queda < 30000) throw new Error("Sin tiempo para más llamadas a Gemini");
  return llamar(prompt, { log, ...opciones, presupuestoMs: Math.min(opciones.presupuestoMs || 8 * 60000, queda) });
}

function limpiarPaso(p) {
  if (!p || typeof p.texto !== "string" || p.texto.trim().length < 15) return null;
  const q = { icono: ICONOS.includes(p.icono) ? p.icono : "emplatar", texto: p.texto.trim() };
  if (Array.isArray(p.usa)) { const u = p.usa.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()); if (u.length) q.usa = u; }
  if (FUEGOS.includes(p.fuego)) q.fuego = p.fuego;
  const m = Number(p.min); if (m > 0 && m < 300) q.min = Math.round(m);
  if (typeof p.consejo === "string" && p.consejo.trim()) q.consejo = p.consejo.trim();
  return q;
}
function valida(r) {
  if (!r || !Array.isArray(r.ingredientes) || !Array.isArray(r.pasos)) return null;
  const ingredientes = r.ingredientes.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
  const pasos = r.pasos.map(limpiarPaso).filter(Boolean);
  if (ingredientes.length < 3 || pasos.length < 5) return null;
  return { ingredientes, pasos: pasos.slice(0, 14) };
}

async function redactar(recetas) {
  // recetas: metadatos decididos por Claude. Devuelve {id: {ingredientes, pasos}}
  const hechos = {};
  let pendientes = recetas.slice();
  for (let vuelta = 1; vuelta <= 3 && pendientes.length; vuelta++) {
    // en lotes de 3: respuestas más cortas, más rápidas y que fallan menos
    for (let i = 0; i < pendientes.length; i += 3) {
      const lote = pendientes.slice(i, i + 3).map((r) => ({
        id: r.id, titulo: r.titulo, subtitulo: r.subtitulo, cocina: r.cocina, raciones: r.raciones || 3,
        tiempo_min: r.tiempo, dificultad: r.dificultad, guia: r.guia || "", truco_para_el_nino: r.truco || "", ...(r.airfryer ? { airfryer: true } : {}), ...(r.rapida ? { rapida: true } : {}),
      }));
      try {
        const res = await llamarGemini(`${REGLAS}\n\nRECETAS:\n${JSON.stringify(lote, null, 1)}`);
        for (const x of res.recetas || []) { const v = valida(x); if (v && lote.some((l) => l.id === x.id)) hechos[x.id] = v; }
      } catch (e) { log("Lote fallido:", e.message); }
    }
    pendientes = pendientes.filter((r) => !hechos[r.id]);
    if (pendientes.length) log(`Vuelta ${vuelta}: faltan ${pendientes.map((r) => r.id).join(", ")}`);
  }
  return { hechos, pendientes };
}

/* ---------------- Fotos: Unsplash y Pexels (con clave) y Wikimedia Commons (sin clave) ----------------
   Se reúnen candidatas de todas y Gemini elige la que muestra de verdad el plato (o ninguna → ilustración).
   Las fotos se enlazan, no se copian (así lo piden Unsplash y Pexels, y el repositorio no crece). */
const UTM = "utm_source=cenas_en_casa&utm_medium=referral";
async function candidatosUnsplash(consulta) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !consulta) return [];
  try {
    const r = await fetch(`https://api.unsplash.com/search/photos?per_page=6&orientation=landscape&content_filter=high&query=${encodeURIComponent(consulta)}`,
      { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { log("Unsplash HTTP", r.status); return []; }
    return ((await r.json()).results || []).filter((ph) => ph.urls?.raw).map((ph) => ({
      // JPG a 600 px: el Safari del iPad antiguo no abre WebP/AVIF
      foto: `${ph.urls.raw}${ph.urls.raw.includes("?") ? "&" : "?"}fm=jpg&q=70&w=600&h=400&fit=crop`,
      fotoCredito: `${ph.user?.name || "Autor"} / Unsplash`,
      fotoAutorUrl: `${ph.user?.links?.html || "https://unsplash.com"}?${UTM}`,
      fotoFuenteUrl: `https://unsplash.com/?${UTM}`,
      descarga: ph.links?.download_location || "",
      titulo: "Unsplash", descripcion: String(ph.alt_description || ph.description || "").slice(0, 200),
    }));
  } catch (e) { log("Unsplash:", e.message); return []; }
}
// Unsplash pide avisar cuando se elige una foto para usarla
async function avisarUnsplash(c) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !c.descarga) return;
  try { await fetch(c.descarga, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15000) }); } catch {}
}
async function candidatosPexels(consulta) {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !consulta) return [];
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?per_page=4&orientation=landscape&query=${encodeURIComponent(consulta)}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { log("Pexels HTTP", r.status); return []; }
    return ((await r.json()).photos || []).filter((ph) => ph.src?.original).map((ph) => ({
      foto: `${ph.src.original}?auto=compress&cs=tinysrgb&w=600`, fotoCredito: `${ph.photographer} / Pexels`,
      fotoAutorUrl: ph.photographer_url || "", fotoFuenteUrl: "https://www.pexels.com",
      titulo: "Pexels", descripcion: String(ph.alt || "").slice(0, 200),
    }));
  } catch (e) { log("Pexels:", e.message); return []; }
}
const quitarHTML = (t) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
async function candidatosWikimedia(consulta) {
  if (!consulta) return [];
  try {
    const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10" +
      "&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=600&gsrsearch=" + encodeURIComponent(consulta + " filetype:bitmap");
    const r = await fetch(url, { headers: { "User-Agent": "cenas-en-casa/1.0 (https://github.com/redpolasapps/cenas)" } });
    if (!r.ok) { log("Wikimedia HTTP", r.status); return []; }
    const pages = Object.values((await r.json()).query?.pages || {}).sort((x, y) => (x.index || 0) - (y.index || 0));
    const out = [];
    for (const pg of pages) {
      const ii = pg.imageinfo?.[0];
      if (!ii || !/jpeg/.test(ii.mime || "") || (ii.width || 0) < 600 || !ii.thumburl) continue;
      const m = ii.extmetadata || {};
      const lic = quitarHTML(m.LicenseShortName?.value);
      if (!/CC|Public domain|PD/i.test(lic)) continue;
      out.push({
        foto: ii.thumburl.split("?")[0],
        fotoCredito: `${quitarHTML(m.Artist?.value).slice(0, 60) || "Autor desconocido"} / Wikimedia Commons (${lic})`,
        titulo: String(pg.title || "").replace(/^File:/, ""),
        descripcion: quitarHTML(m.ImageDescription?.value).slice(0, 200),
      });
    }
    return out;
  } catch (e) { log("Wikimedia:", e.message); return []; }
}

// Busca fotos para varias recetas: reúne candidatas (Unsplash, Pexels, Wikimedia) y le pide a Gemini
// (una sola llamada) que elija solo las que muestran de verdad ese plato.
export async function buscarFotos(recetas) {
  const res = {};
  const sinResolver = [];
  for (const r of recetas) {
    const consulta = r.busqueda_foto || r.titulo;
    const vistos = new Set(), cands = [];
    const mete = (lista, max) => { for (const c of lista) if (!vistos.has(c.foto) && cands.length < max) { vistos.add(c.foto); cands.push(c); } };
    mete(await candidatosUnsplash(consulta), 6);
    mete(await candidatosPexels(consulta), 9);
    if (cands.length < 4) {
      const palabras = consulta.split(/\s+/).filter(Boolean);
      const qs = [consulta]; if (palabras.length > 2) qs.push(palabras.slice(0, 2).join(" "));
      for (const q of qs) mete(await candidatosWikimedia(q), 12);
    }
    if (cands.length) sinResolver.push({ r, cands });
  }
  if (sinResolver.length) {
    const prompt = `Para cada receta te doy fotos candidatas (fuente y descripción de la foto). ` +
      `Elige, para cada receta, la candidata que muestre CLARAMENTE ese mismo plato ya cocinado y servido (mismo ingrediente principal y una preparación parecida). ` +
      `Descarta fotos de restaurantes, fachadas, personas, mapas, ingredientes crudos o platos distintos. Si ninguna encaja de verdad, pon null. Es mejor null que una foto dudosa.\n` +
      `Responde SOLO con JSON: {"elecciones":[{"id":"...","n":<número de la candidata o null>}]}\n\n` +
      JSON.stringify(sinResolver.map(({ r, cands }) => ({ id: r.id, receta: r.titulo, descripcion: r.subtitulo || "", candidatas: cands.map((c, i) => ({ n: i, fuente: c.titulo, descripcion: c.descripcion })) })), null, 1);
    try {
      const j = await llamarGemini(prompt, { presupuestoMs: 2 * 60000 });
      for (const e of j.elecciones || []) {
        const item = sinResolver.find((x) => x.r.id === e.id);
        if (item && Number.isInteger(e.n) && item.cands[e.n]) {
          const c = item.cands[e.n];
          res[e.id] = { foto: c.foto, fotoCredito: c.fotoCredito, ...(c.fotoAutorUrl ? { fotoAutorUrl: c.fotoAutorUrl, fotoFuenteUrl: c.fotoFuenteUrl } : {}) };
          await avisarUnsplash(c);
          log(`Foto elegida por Gemini para "${item.r.titulo}": ${c.titulo} — ${c.descripcion.slice(0, 60)}`);
        }
        else if (item) log(`Gemini no ve ninguna foto buena para "${item.r.titulo}"`);
      }
    } catch (e) { log("No se pudieron elegir fotos:", e.message); }
  }
  return res;
}

/* ---------------- Índice ligero del recetario (lo lee Claude para decidir) ---------------- */
export async function escribirIndice(hist) {
  const indice = (hist.recetas || []).map((r) => {
    const fechas = (r.usos || []).map((u) => u.fecha).sort();
    return {
      id: r.id, titulo: r.titulo, cocina: r.cocina || "", peques: !!r.peques, healthy: !!r.healthy, gourmet: !!r.gourmet, airfryer: !!r.airfryer, rapida: !!r.rapida,
      etiquetas: r.etiquetas || [], momentos: [...new Set((r.usos || []).map((u) => (u.dia === "Entre semana" ? "Cena" : `${u.dia} ${u.momento}`)))],
      primera: fechas[0] || "", ultima: fechas[fechas.length - 1] || "", veces: fechas.length, foto: !!r.foto,
    };
  }).sort((a, b) => (a.ultima < b.ultima ? 1 : -1));
  await writeFile(path.join(RAIZ, "recetas/indice.json"), "[\n" + indice.map((x) => JSON.stringify(x)).join(",\n") + "\n]\n");
  log(`Índice del recetario: ${indice.length} recetas`);
}

/* ---------------- principal ---------------- */
export async function main() {
  let planRel = process.env.PLAN;
  if (!planRel) {
    const files = (await readdir(path.join(RAIZ, "plan")).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    if (!files.length) { log("No hay planes. Nada que hacer."); return; }
    planRel = path.join("plan", files[files.length - 1]);
  }
  const plan = JSON.parse(await readFile(path.join(RAIZ, planRel), "utf8"));
  log("Plan:", planRel, "fecha", plan.fecha);

  const actual = (await leerData()) || {};
  if (!process.env.FORZAR && actual.hoy?.fecha === plan.fecha && actual.plan === path.basename(planRel) && (actual.hoy.cenas || []).every((r) => (r.pasos || []).length)) {
    log("data.js ya está generado con este plan. Nada que hacer."); return;
  }
  const hist = await leerJSON("recetas/historial.json", { recetas: [] });
  const porId = Object.fromEntries((hist.recetas || []).map((r) => [r.id, r]));

  // Resolver recetas: reutilizadas (del recetario) o nuevas (a redactar)
  const nuevas = [];
  const resolver = (p) => {
    if (p.reutilizar) {
      const r = porId[p.reutilizar];
      if (!r) throw new Error(`El plan reutiliza "${p.reutilizar}", que no está en el recetario`);
      const copia = JSON.parse(JSON.stringify(r)); delete copia.usos;
      if (p.porque) copia.porque = p.porque;
      if (p.truco) copia.truco = p.truco;
      return copia;
    }
    // Si ya existe en el recetario por una ejecución anterior de este mismo plan, se vuelve a redactar; si no, es un error del plan.
    if (porId[p.id] && !(porId[p.id].usos || []).some((u) => u.fecha === plan.fecha)) throw new Error(`La receta nueva "${p.id}" ya existe en el recetario: usa "reutilizar"`);
    const r = { ...p, foto: p.foto || "", fotoCredito: p.fotoCredito || "", fotosUrl: "" };
    nuevas.push(r);
    return r;
  };
  const cenas = (plan.hoy?.cenas || []).map(resolver);
  const finde = plan.finde ? { fechas: plan.finde.fechas, hasta: plan.finde.comidas.map((b) => b.fecha || "").sort().pop() || "", comidas: plan.finde.comidas.map((b) => ({ ...b, opciones: b.opciones.map(resolver) })), compra: [] } : null;

  // Gemini redacta las nuevas
  const { hechos, pendientes } = await redactar(nuevas);
  if (pendientes.length) throw new Error(`Gemini no pudo redactar: ${pendientes.map((r) => r.id).join(", ")}. No se publica nada.`);
  for (const r of nuevas) Object.assign(r, hechos[r.id]);

  // Fotos: para toda receta sin foto (nuevas y del recetario)
  const todas = [...cenas, ...(finde ? finde.comidas.flatMap((b) => b.opciones) : [])];
  const sinFoto = todas.filter((r) => !r.foto || (process.env.FORZAR && /wikimedia/.test(r.foto) && nuevas.includes(r)));
  const fotos = await buscarFotos(sinFoto);
  for (const r of sinFoto) { if (fotos[r.id]) Object.assign(r, fotos[r.id]); else if (nuevas.includes(r)) { r.foto = ""; r.fotoCredito = ""; } }
  log(`Fotos añadidas: ${Object.keys(fotos).length} de ${sinFoto.length} recetas que no tenían`);
  for (const r of [...cenas, ...(finde ? finde.comidas.flatMap((b) => b.opciones) : [])]) { delete r.guia; delete r.busqueda_foto; delete r.reutilizar; }

  // data.js
  const data = {
    actualizado: ahoraMadrid(),
    plan: path.basename(planRel),
    hoy: { fecha: plan.fecha, cole: plan.hoy?.cole || {}, consejo: plan.hoy?.consejo || "", explicacion: plan.hoy?.explicacion || "", cenas },
    finde: finde || actual.finde || { fechas: "", comidas: [], compra: [] },
  };
  await writeFile(path.join(RAIZ, "data.js"), "// Lo genera scripts/expandir.mjs a partir del plan de Claude. Ver AGENTE.md\nwindow.MENU_DATA = " + JSON.stringify(data, null, 1) + ";\n");

  // historial
  const usar = (r, uso) => {
    const limpio = JSON.parse(JSON.stringify(r)); delete limpio._bg;
    const esNueva = nuevas.includes(r);
    if (porId[r.id] && esNueva) { const usos = porId[r.id].usos || []; Object.keys(porId[r.id]).forEach((k) => delete porId[r.id][k]); Object.assign(porId[r.id], limpio, { usos }); }
    const h = porId[r.id] || (porId[r.id] = { ...limpio, usos: [] });
    if (!porId[r.id].usos) porId[r.id].usos = [];
    if (!hist.recetas.includes(h)) hist.recetas.push(h);
    if (!h.usos.some((u) => u.fecha === uso.fecha && u.momento === uso.momento)) h.usos.push(uso);
  };
  cenas.forEach((r) => usar(r, { fecha: plan.fecha, dia: diaSemana(plan.fecha), momento: "Cena" }));
  if (finde) finde.comidas.forEach((b) => b.opciones.forEach((r) => usar(r, { fecha: b.fecha || plan.fecha, dia: b.dia, momento: b.momento })));
  hist.actualizado = data.actualizado;
  await writeFile(path.join(RAIZ, "recetas/historial.json"), JSON.stringify(hist, null, 1));
  await escribirIndice(hist);
  log(`OK: ${cenas.length} cenas, ${nuevas.length} nuevas redactadas por Gemini, recetario con ${hist.recetas.length} recetas.`);
}

const esPrincipal = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (esPrincipal && process.argv.includes("--indice")) {
  leerJSON("recetas/historial.json", { recetas: [] }).then(escribirIndice).catch((e) => { console.error(e); process.exit(1); });
} else if (esPrincipal) {
  main().catch((e) => { console.error("[expandir] ERROR:", e.message); process.exit(1); });
}
