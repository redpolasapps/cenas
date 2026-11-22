// Prueba de las fuentes de fotos (no guarda nada): node scripts/probar-fotos.mjs
import { buscarFotos } from "./expandir.mjs";
const recetas = [
  { id: "prueba-1", titulo: "Merluza al horno con patatas", busqueda_foto: "baked hake potatoes" },
  { id: "prueba-2", titulo: "Crema de calabaza", busqueda_foto: "pumpkin cream soup" },
  { id: "prueba-3", titulo: "Yakisoba de pollo y verduras", busqueda_foto: "chicken yakisoba noodles" },
];
console.log("Unsplash:", process.env.UNSPLASH_ACCESS_KEY ? "clave presente" : "SIN CLAVE", "· Pexels:", process.env.PEXELS_API_KEY ? "clave presente" : "sin clave");
const res = await buscarFotos(recetas);
for (const r of recetas) console.log(`${r.titulo}: ${res[r.id] ? res[r.id].fotoCredito + " → " + res[r.id].foto : "sin foto (se usaría la ilustración)"}`);
