// PLAN DE EMERGENCIA: si a media tarde la web no tiene las cenas de hoy (por ejemplo, porque Claude
// se ha quedado sin cuota), Gemini hace TODO: decide el plan con las mismas reglas y lo redacta.
// Lo lanza .github/workflows/emergencia.yml. Sin dependencias: Node 20+.
//
//   GEMINI_API_KEY  (obligatoria)
//   FORZAR=1        (opcional) hacerlo aunque la web ya esté actualizada hoy (para pruebas)
//   FECHA=AAAA-MM-DD (opcional) simular otro día (para pruebas)

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { llamarGemini, main as expandir, FAMILIA } from "./expandir.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const log = (...a) => console.log("[emergencia]", ...a);
const COCINAS = ["Española", "Mediterránea", "Italiana", "Japonesa", "Asiática", "Americana", "Mexicana", "Árabe", "Casera"];
const IMAGENES = ["pescado", "tortilla", "crema", "arroz", "pasta", "pizza", "hamburguesa", "pollo-horno", "garbanzos", "sopa", "quesadilla", "generico"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: FAMILIA.zona || "Europe/Madrid" }).format(new Date());
const masDias = (f, n) => new Date(new Date(f + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
const dow = (f) => new Date(f + "T12:00:00Z").getUTCDay();
const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function leerJSON(rel, def) { try { return JSON.parse(await readFile(path.join(RAIZ, rel), "utf8")); } catch { return def; } }
async function leerData() {
  try { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(await readFile(path.join(RAIZ, "data.js"), "utf8"), ctx); return ctx.window.MENU_DATA || {}; }
  catch { return {}; }
}
async function menuDe(fecha) {
  const m = await leerJSON(`menus/${fecha.slice(0, 7)}.json`, null);
  return m?.dias?.[fecha] || null;
}

async function main() {
  const hoy = process.env.FECHA || hoyMadrid();
  const data = await leerData();
  if (!process.env.FORZAR && data.hoy?.fecha === hoy && (data.hoy.cenas || []).every((r) => (r.pasos || []).length)) {
    log(`La web ya tiene las cenas de hoy (${hoy}). No hace falta el plan de emergencia.`); return;
  }
  log(`La web NO está actualizada para ${hoy}: Gemini lo hace todo.`);

  const d = dow(hoy), finDeSemana = d === 0 || d === 6;
  const menuHoy = finDeSemana ? null : await menuDe(hoy);
  // Menú de la semana (lunes a viernes) que se conozca
  const lunes = masDias(hoy, -((d + 6) % 7));
  const semana = [];
  for (let i = 0; i < 5; i++) { const f = masDias(lunes, i); const m = await menuDe(f); semana.push(`${DIAS[dow(f)]} ${f}: ${m ? m.platos.join(" · ") : "(sin menú)"}`); }

  // Recetario: candidatas a repetir (14 días sin salir) y cenas recientes (para no repetir)
  const indice = await leerJSON("recetas/indice.json", []);
  const limite = masDias(hoy, -14);
  const candidatas = indice.filter((r) => r.ultima && r.ultima <= limite).sort((a, b) => (a.ultima < b.ultima ? -1 : 1)).slice(0, 40);
  const recientes = indice.filter((r) => r.ultima > limite).map((r) => r.titulo);
  const idsExistentes = new Set(indice.map((r) => r.id));

  // ¿Toca preparar el fin de semana?
  const hasta = data.finde?.hasta || "";
  const tocaFinde = !hasta || hasta < hoy;
  const sab = masDias(hoy, (6 - d + 7) % 7 || (d === 6 ? 0 : 7)), dom = masDias(sab, 1);
  const findeHoy = finDeSemana && !tocaFinde ? (data.finde?.comidas || []).find((b) => b.dia === (d === 6 ? "Sábado" : "Domingo") && b.momento === "Cena") : null;

  const reglas = await readFile(path.join(RAIZ, "AGENTE.md"), "utf8");
  const reglasDecision = reglas.slice(reglas.indexOf("## Qué hacer en cada ejecución"), reglas.indexOf("## Formato de una receta"));

  const prompt = `Eres el planificador de cenas de una familia (${FAMILIA.ciudad || "Barcelona"}, cocina casera). Hoy es ${DIAS[d]} ${hoy}.
Tienes que DECIDIR el plan del día siguiendo estas reglas (son las mismas que usa otro agente; ignora lo que diga de git, commits, data.js o historial: tú solo devuelves el plan):

${reglasDecision}

DATOS DE ESTA FAMILIA (si contradicen algo de arriba sobre gustos, edad o raciones, MANDAN ESTOS):
- Niño de ${FAMILIA.edad || 4} años. Raciones por receta: ${FAMILIA.raciones || 3}.
- Gustos: ${FAMILIA.gustos || "cocina mediterránea casera"}
- Evitar: ${FAMILIA.evitar || "nada en especial"}
${FAMILIA.alergias ? `- ALERGIAS (OBLIGATORIO, nunca usarlas): ${FAMILIA.alergias}` : ""}

DATOS DE HOY
- Comida del cole hoy: ${menuHoy ? menuHoy.platos.join(" · ") + (menuHoy.nota ? ` (${menuHoy.nota})` : "") : finDeSemana ? "hoy no hay cole (fin de semana)" : "no hay menú para hoy (festivo o sin datos)"}
- Menú del cole de esta semana:\n${semana.map((x) => "  - " + x).join("\n")}
- Cenas de los últimos 14 días (NO las repitas ni hagas casi lo mismo): ${recientes.join(" | ") || "(ninguna)"}
- Recetas del recetario que SÍ se pueden repetir (como mucho 2 de las 6; usa "reutilizar" con su id exacto):\n${candidatas.map((r) => `  - ${r.id} | ${r.titulo} | ${r.cocina}${r.healthy ? " | healthy" : ""}${r.peques ? " | peques" : ""}${r.gourmet ? " | gourmet" : ""}`).join("\n") || "  (ninguna todavía)"}
${findeHoy ? `- Hoy es fin de semana: incluye entre las 6 cenas estas opciones ya planificadas (con "reutilizar"): ${findeHoy.opciones.map((r) => r.id).join(", ")}` : ""}
- ${tocaFinde ? `TOCA preparar el fin de semana del sábado ${sab} y domingo ${dom}.` : "NO toca preparar el fin de semana: pon \"finde\": null."}

FORMATO DE RESPUESTA: SOLO JSON con esta forma exacta:
{
 "fecha": "${hoy}",
 "hoy": {
  "cole": ${menuHoy ? JSON.stringify({ platos: menuHoy.platos, ...(menuHoy.nota ? { nota: menuHoy.nota } : {}) }) : "{}"},
  "consejo": "una frase",
  "explicacion": "2 o 3 frases: qué ha comido hoy, cómo va la semana y qué buscan las cenas",
  "cenas": [ 6 elementos, en orden; la sexta es la de capricho ]
 },
 "finde": ${tocaFinde ? `{"fechas": "Sábado ${Number(sab.slice(8))} y domingo ${Number(dom.slice(8))} de ${MESES[Number(sab.slice(5, 7)) - 1]}", "comidas": [4 bloques {"dia":"Sábado"|"Domingo","momento":"Comida"|"Cena","fecha":"${sab}" o "${dom}","opciones":[3 recetas, la tercera gourmet]} en orden Sábado Comida, Sábado Cena, Domingo Comida, Domingo Cena]}` : "null"}
}
Cada receta es o {"reutilizar":"<id del recetario>"} o una receta NUEVA con exactamente estos campos:
{"id":"slug-unico-en-minusculas","titulo":"...","subtitulo":"...","cocina":uno de ${JSON.stringify(COCINAS)},"imagen":uno de ${JSON.stringify(IMAGENES)},
 "peques":bool,"healthy":bool,"gourmet":bool,"tiempo":minutos,"dificultad":"Fácil"|"Media","raciones":${FAMILIA.raciones || 3},
 "plato":{"verdura":n,"proteina":n,"hidratos":n} (suman 100),"porque":"...","truco":"...","etiquetas":["..."],
 "guia":"1-2 frases para quien la redactará: ingredientes principales y técnica","busqueda_foto":"2-4 palabras en inglés"}
NO escribas ingredientes ni pasos. Las 6 cenas: al menos 2 healthy, al menos 2 peques, la sexta gourmet, como mucho 1 exótica (japonesa, americana…), y como mucho 2 "reutilizar".`;

  let plan = null, problemas = [];
  for (let intento = 1; intento <= 3 && !plan; intento++) {
    const p = await llamarGemini(intento === 1 ? prompt : `${prompt}\n\nTu respuesta anterior tenía estos problemas, corrígelos: ${problemas.join("; ")}`);
    problemas = validar(p, { hoy, candidatas: new Set(candidatas.map((r) => r.id)), finde: findeHoy, idsExistentes, tocaFinde, flags: Object.fromEntries(indice.map((r) => [r.id, r])) });
    if (!problemas.length) plan = p; else log(`Intento ${intento}: ${problemas.join("; ")}`);
  }
  if (!plan) throw new Error("Gemini no ha conseguido un plan válido: " + problemas.join("; "));
  plan.autor = "gemini (emergencia)";

  const rel = `plan/${hoy}.json`;
  await writeFile(path.join(RAIZ, rel), JSON.stringify(plan, null, 1));
  log(`Plan escrito en ${rel}. Ahora Gemini redacta las recetas.`);
  process.env.PLAN = rel;
  process.env.FORZAR = "1";
  await expandir();
}

function validar(p, ctx) {
  const e = [];
  if (!p || !p.hoy || !Array.isArray(p.hoy.cenas)) return ["falta hoy.cenas"];
  p.fecha = ctx.hoy;
  const cenas = p.hoy.cenas;
  if (cenas.length !== 6) e.push(`hay ${cenas.length} cenas y deben ser 6`);
  const reus = cenas.filter((r) => r.reutilizar);
  const permitidas = new Set([...ctx.candidatas, ...(ctx.finde ? ctx.finde.opciones.map((r) => r.id) : [])]);
  if (reus.length > 2 + (ctx.finde ? ctx.finde.opciones.length : 0)) e.push(`hay ${reus.length} "reutilizar" y como mucho pueden ser 2`);
  reus.forEach((r) => { if (!permitidas.has(r.reutilizar)) e.push(`"${r.reutilizar}" no se puede reutilizar (no existe o salió hace menos de 14 días)`); });
  const todas = [...cenas, ...(p.finde?.comidas || []).flatMap((b) => b.opciones || [])];
  const vistos = new Set();
  todas.filter((r) => !r.reutilizar).forEach((r) => {
    if (!r.titulo) { e.push("una receta nueva no tiene título"); return; }
    r.id = slug(r.id || r.titulo);
    if (ctx.idsExistentes.has(r.id) || vistos.has(r.id)) r.id = slug(`${r.id}-${ctx.hoy}`);
    vistos.add(r.id);
    if (!COCINAS.includes(r.cocina)) r.cocina = "Casera";
    if (!IMAGENES.includes(r.imagen)) r.imagen = "generico";
    r.raciones = r.raciones || 3;
    if (!r.guia) e.push(`"${r.titulo}" no tiene guia`);
    delete r.ingredientes; delete r.pasos;
  });
  const nuevas = cenas.filter((r) => !r.reutilizar);
  if (cenas[5] && !cenas[5].reutilizar && !cenas[5].gourmet) e.push("la sexta cena debe tener gourmet: true");
  const flag = (r, k) => (r.reutilizar ? !!ctx.flags[r.reutilizar]?.[k] : !!r[k]);
  if (cenas.filter((r) => flag(r, "healthy")).length < 2) e.push("hacen falta al menos 2 cenas con healthy: true");
  if (cenas.filter((r) => flag(r, "peques")).length < 2) e.push("hacen falta al menos 2 cenas con peques: true");
  if (ctx.tocaFinde) {
    const b = p.finde?.comidas || [];
    if (b.length !== 4 || b.some((x) => (x.opciones || []).length !== 3)) e.push("el fin de semana debe tener 4 bloques con 3 opciones cada uno");
  } else p.finde = null;
  return e;
}

main().catch((e) => { console.error("[emergencia] ERROR:", e.message); process.exit(1); });
