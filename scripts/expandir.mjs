// Expande el plan diario que escribe Claude (plan/AAAA-MM-DD.json) en recetas completas.
// - Gemini escribe ingredientes y pasos detallados (lo "pesado").
// - Pexels (opcional) pone una foto real.
// - Escribe data.js y actualiza recetas/historial.json.
// Lo ejecuta GitHub Actions (.github/workflows/expandir.yml). Sin dependencias: Node 20+.
//
// Variables de entorno:
//   GEMINI_API_KEY   (obligatoria)  clave de Google AI Studio, guardada como secreto en GitHub
//   PEXELS_API_KEY   (opcional)     clave gratuita de pexels.com/api para fotos reales
//   GEMINI_MODEL     (opcional)     por defecto gemini-2.5-flash
//   PLAN             (opcional)     ruta del plan; por defecto, el más reciente de plan/
//   MOCK_GEMINI      (solo pruebas) archivo JSON con una respuesta simulada de Gemini

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ICONOS = ["cortar", "sarten", "horno", "olla", "mezclar", "emplatar", "envolver", "lavar"];
const FUEGOS = ["suave", "medio", "fuerte"];
const MODELOS = [process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];

const log = (...a) => console.log("[expandir]", ...a);

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
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
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
const REGLAS = `Eres un redactor de recetas de cocina casera española para una familia con un niño de 4 años.
Te paso una lista de recetas YA DECIDIDAS (título, tipo de cocina, raciones, tiempo y una guía). NO cambies el plato ni lo que dice la guía: solo escribe sus ingredientes y sus pasos.

Para cada receta devuelve:
- "ingredientes": lista completa, un ingrediente por elemento, con cantidades concretas en gramos, mililitros o unidades claras ("400 g de merluza sin espinas", "2 cucharadas de aceite de oliva", "1 cebolla mediana (150 g)"). Para el número de raciones indicado.
- "pasos": entre 6 y 12 pasos, escritos para alguien que casi NO sabe cocinar. Uno por acción. Cada paso es un objeto con:
  - "texto": 1 a 3 frases claras que explican CÓMO hacerlo: tamaño del corte, recipiente, cantidad de aceite, cuándo añadir cada cosa. Si usas un término de cocina, explícalo ("pochar: cocinar a fuego suave hasta que esté blandita y transparente").
  - "usa": lista con los ingredientes y cantidades EXACTAS que se usan en ese paso. Si el paso no usa ingredientes, lista vacía.
  - "icono": uno de: cortar, sarten, horno, olla, mezclar, emplatar, envolver, lavar.
  - "fuego": "suave", "medio" o "fuerte" solo si el paso es en el fuego. Si es en el horno, indica en el texto la temperatura y el modo (arriba y abajo).
  - "min": minutos del paso si los tiene (número), si no omítelo.
  - "consejo": opcional, una aclaración útil: cómo saber que está hecho (color, textura, que el cuchillo entre fácil), qué hacer si algo sale mal o un aviso de seguridad.
  El primer paso suele ser preparar (precalentar el horno, poner agua a hervir, sacar ingredientes). El último, emplatar, incluida la versión para el niño si la guía o el truco la mencionan.
- Seguridad para el niño de 4 años: sin picante, poca sal, pescado sin espinas, carne sin huesecillos, nada de frutos secos enteros ni uvas o tomates cherry enteros.
- Los ingredientes de la lista tienen que cuadrar con lo que se usa en los pasos.

Responde SOLO con JSON con esta forma: {"recetas":[{"id":"...","ingredientes":[...],"pasos":[...]}]}, una entrada por cada receta, con el mismo "id".`;

async function llamarGemini(prompt) {
  if (process.env.MOCK_GEMINI) return JSON.parse(await readFile(process.env.MOCK_GEMINI, "utf8"));
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  let ultimoError;
  for (const modelo of MODELOS) {
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 32000 },
          }),
        });
        const txt = await r.text();
        if (r.status === 404) { ultimoError = new Error(`${modelo}: 404`); break; }
        if (!r.ok) throw new Error(`${modelo}: HTTP ${r.status} ${txt.slice(0, 300)}`);
        const j = JSON.parse(txt);
        const out = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        log(`Gemini (${modelo}) respondió ${out.length} caracteres`);
        return JSON.parse(out.replace(/^```(json)?|```$/g, "").trim());
      } catch (e) {
        ultimoError = e; log("Fallo Gemini:", e.message);
        await new Promise((res) => setTimeout(res, 4000 * intento));
      }
    }
  }
  throw ultimoError || new Error("Gemini no respondió");
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
    // en lotes de 6 para no pasar del límite de salida
    for (let i = 0; i < pendientes.length; i += 6) {
      const lote = pendientes.slice(i, i + 6).map((r) => ({
        id: r.id, titulo: r.titulo, subtitulo: r.subtitulo, cocina: r.cocina, raciones: r.raciones || 3,
        tiempo_min: r.tiempo, dificultad: r.dificultad, guia: r.guia || "", truco_para_el_nino: r.truco || "",
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

/* ---------------- Pexels ---------------- */
async function fotoPexels(consulta) {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !consulta) return null;
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=${encodeURIComponent(consulta)}`, { headers: { Authorization: key } });
    if (!r.ok) { log("Pexels HTTP", r.status); return null; }
    const ph = (await r.json()).photos?.[0];
    if (!ph?.src?.original) return null;
    return { foto: `${ph.src.original}?auto=compress&cs=tinysrgb&w=600`, fotoCredito: `${ph.photographer} / Pexels` };
  } catch (e) { log("Pexels:", e.message); return null; }
}

/* ---------------- principal ---------------- */
async function main() {
  let planRel = process.env.PLAN;
  if (!planRel) {
    const files = (await readdir(path.join(RAIZ, "plan")).catch(() => [])).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    if (!files.length) { log("No hay planes. Nada que hacer."); return; }
    planRel = path.join("plan", files[files.length - 1]);
  }
  const plan = JSON.parse(await readFile(path.join(RAIZ, planRel), "utf8"));
  log("Plan:", planRel, "fecha", plan.fecha);

  const actual = (await leerData()) || {};
  if (actual.hoy?.fecha === plan.fecha && actual.plan === path.basename(planRel) && (actual.hoy.cenas || []).every((r) => (r.pasos || []).length)) {
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
    if (porId[p.id]) throw new Error(`La receta nueva "${p.id}" ya existe en el recetario: usa "reutilizar"`);
    const r = { ...p, foto: p.foto || "", fotoCredito: p.fotoCredito || "", fotosUrl: "" };
    nuevas.push(r);
    return r;
  };
  const cenas = (plan.hoy?.cenas || []).map(resolver);
  const finde = plan.finde ? { fechas: plan.finde.fechas, comidas: plan.finde.comidas.map((b) => ({ ...b, opciones: b.opciones.map(resolver) })), compra: [] } : null;

  // Gemini redacta las nuevas
  const { hechos, pendientes } = await redactar(nuevas);
  if (pendientes.length) throw new Error(`Gemini no pudo redactar: ${pendientes.map((r) => r.id).join(", ")}. No se publica nada.`);
  for (const r of nuevas) Object.assign(r, hechos[r.id]);

  // Fotos (solo recetas nuevas sin foto)
  let nfotos = 0;
  for (const r of nuevas) {
    if (r.foto) continue;
    const f = await fotoPexels(r.busqueda_foto || r.titulo);
    if (f) { Object.assign(r, f); nfotos++; }
  }
  log(`Fotos nuevas: ${nfotos}/${nuevas.length}`);
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
    const h = porId[r.id] || (porId[r.id] = { ...limpio, usos: [] });
    if (!porId[r.id].usos) porId[r.id].usos = [];
    if (!hist.recetas.includes(h)) hist.recetas.push(h);
    if (!h.usos.some((u) => u.fecha === uso.fecha && u.momento === uso.momento)) h.usos.push(uso);
  };
  cenas.forEach((r) => usar(r, { fecha: plan.fecha, dia: diaSemana(plan.fecha), momento: "Cena" }));
  if (finde) finde.comidas.forEach((b) => b.opciones.forEach((r) => usar(r, { fecha: b.fecha || plan.fecha, dia: b.dia, momento: b.momento })));
  hist.actualizado = data.actualizado;
  await writeFile(path.join(RAIZ, "recetas/historial.json"), JSON.stringify(hist, null, 1));
  log(`OK: ${cenas.length} cenas, ${nuevas.length} nuevas redactadas por Gemini, recetario con ${hist.recetas.length} recetas.`);
}

main().catch((e) => { console.error("[expandir] ERROR:", e.message); process.exit(1); });
