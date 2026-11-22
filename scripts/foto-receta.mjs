// Cambia la foto de una receta (en la web de hoy y en el recetario) buscando en Unsplash/Pexels/Wikimedia
// y dejando que Gemini elija viendo las fotos. Uso: RECETA="minestrone" [CONSULTA="minestrone bean soup"] node scripts/foto-receta.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { buscarFotos, escribirIndice } from "./expandir.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const busca = String(process.env.RECETA || "").toLowerCase().trim();
if (!busca) { console.error("Falta RECETA (id o parte del título)"); process.exit(1); }

const code = await readFile(path.join(RAIZ, "data.js"), "utf8");
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(code, ctx);
const data = ctx.window.MENU_DATA;
const hist = JSON.parse(await readFile(path.join(RAIZ, "recetas/historial.json"), "utf8"));

const todas = [];
(function recorre(o) { if (Array.isArray(o)) o.forEach(recorre); else if (o && typeof o === "object") { if (o.id && o.titulo && o.pasos) todas.push(o); Object.values(o).forEach(recorre); } })([data, hist]);
const r = todas.find((x) => x.id === busca) || todas.find((x) => x.titulo.toLowerCase().includes(busca) || x.id.includes(busca));
if (!r) { console.error(`No encuentro ninguna receta con "${busca}"`); process.exit(1); }
console.log(`Receta: ${r.titulo} (${r.id}) · foto actual: ${r.foto || "ninguna"}`);

const res = await buscarFotos([{ id: r.id, titulo: r.titulo, subtitulo: r.subtitulo, busqueda_foto: process.env.CONSULTA || r.busqueda_foto || r.titulo }]);
const f = res[r.id];
if (!f) { console.log("No se ha encontrado una foto mejor: se deja como estaba."); process.exit(0); }
let n = 0;
for (const x of todas) if (x.id === r.id) {
  x.foto = f.foto; x.fotoCredito = f.fotoCredito;
  if (f.fotoAutorUrl) { x.fotoAutorUrl = f.fotoAutorUrl; x.fotoFuenteUrl = f.fotoFuenteUrl; } else { delete x.fotoAutorUrl; delete x.fotoFuenteUrl; }
  n++;
}
await writeFile(path.join(RAIZ, "data.js"), "// Lo genera scripts/expandir.mjs a partir del plan de Claude. Ver AGENTE.md\nwindow.MENU_DATA = " + JSON.stringify(data, null, 1) + ";\n");
await writeFile(path.join(RAIZ, "recetas/historial.json"), JSON.stringify(hist, null, 1));
await escribirIndice(hist);
console.log(`Foto nueva (${n} sitios): ${f.fotoCredito} → ${f.foto}`);
