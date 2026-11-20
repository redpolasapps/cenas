// Lista compacta de recetas del recetario que se pueden repetir hoy (sin salir en los últimos 14 días).
// Uso: node scripts/candidatas.mjs [AAAA-MM-DD]   → una línea por receta, como mucho 60, de la más antigua a la más reciente.
import { readFileSync } from "node:fs";
const hoy = process.argv[2] || new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const limite = new Date(new Date(hoy + "T12:00:00Z").getTime() - 14 * 864e5).toISOString().slice(0, 10);
let indice = [];
try { indice = JSON.parse(readFileSync(new URL("../recetas/indice.json", import.meta.url), "utf8")); } catch {}
const ok = indice.filter((r) => r.ultima && r.ultima <= limite).sort((a, b) => (a.ultima < b.ultima ? -1 : 1)).slice(0, 60);
console.log(`# ${ok.length} candidatas (sin salir desde el ${limite}) de ${indice.length} recetas. Formato: id | título | cocina | etiquetas | flags | última vez | veces`);
for (const r of ok) {
  const f = [r.peques && "peques", r.healthy && "healthy", r.gourmet && "gourmet", r.airfryer && "airfryer", r.foto && "foto"].filter(Boolean).join(",");
  console.log(`${r.id} | ${r.titulo} | ${r.cocina} | ${(r.etiquetas || []).join("/")} | ${f} | ${r.ultima} | ${r.veces}`);
}
