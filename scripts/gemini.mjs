// Llamada robusta a Gemini (API gratuita de Google AI Studio). Sin dependencias.
//
// - No lleva una lista fija de modelos: pregunta a Google cuáles hay ahora (Google retira
//   modelos sin avisar) y elige los "flash" actuales, por orden de preferencia.
// - Cada llamada se corta a los 2,5 minutos (antes se quedaba colgada 5).
// - Saturado (503) → prueba el siguiente modelo; si todos lo están, espera 30-60 s y vuelve.
// - Cuota (429) → espera lo que diga Google (retryDelay); si es la cuota del día, deja ese modelo.
// - Modelo retirado (404) → no lo vuelve a intentar.
// - Sigue probando hasta agotar un presupuesto de tiempo (por defecto 10 minutos).

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const RESPALDO = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const ORDEN = [
  /^gemini-flash-latest$/,
  /^gemini-\d+(\.\d+)?-flash$/,
  /^gemini-flash-lite-latest$/,
  /^gemini-\d+(\.\d+)?-flash-lite$/,
  /^gemini-\d+(\.\d+)?-flash(-lite)?-preview(-\d\d-\d{4})?$/,
];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const version = (n) => Number((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);

let cache = null;
export async function modelosDisponibles(key, log = () => {}) {
  if (cache) return cache;
  let nombres = [];
  try {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20000) });
    if (r.ok) {
      const j = await r.json();
      nombres = (j.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => String(m.name).replace(/^models\//, ""));
    } else log(`No he podido listar modelos (HTTP ${r.status})`);
  } catch (e) { log("No he podido listar modelos:", e.message); }
  const elegidos = [];
  for (const re of ORDEN) {
    nombres.filter((n) => re.test(n) && !elegidos.includes(n)).sort((a, b) => version(b) - version(a)).forEach((n) => elegidos.push(n));
  }
  const pedido = process.env.GEMINI_MODEL;
  cache = [...new Set([pedido, ...elegidos.slice(0, 4), ...(elegidos.length ? [] : RESPALDO)].filter(Boolean))];
  log("Modelos a usar:", cache.join(", "));
  return cache;
}

function esperaDeGoogle(txt) {
  const m = String(txt).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(Number(m[1]) * 1000) : 0;
}

export async function llamarGemini(prompt, { log = () => {}, presupuestoMs = 10 * 60000, timeoutMs = 150000, temperature = 0.4, maxOutputTokens = 32000 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY");
  const fin = Date.now() + presupuestoMs;
  const muertos = new Set();
  let ultimo, ronda = 0;
  while (Date.now() < fin) {
    const lista = (await modelosDisponibles(key, log)).filter((m) => !muertos.has(m));
    if (!lista.length) break;
    ronda++;
    let espera = 0;
    for (const modelo of lista) {
      const queda = fin - Date.now();
      if (queda < 15000) break;
      try {
        const r = await fetch(`${BASE}/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature, maxOutputTokens },
          }),
          signal: AbortSignal.timeout(Math.min(timeoutMs, queda)),
        });
        const txt = await r.text();
        if (r.status === 404) { muertos.add(modelo); log(`${modelo}: ya no existe (404)`); continue; }
        if (r.status === 429) {
          const ms = esperaDeGoogle(txt);
          if (/PerDay|per day/i.test(txt)) { muertos.add(modelo); log(`${modelo}: cuota del día agotada`); }
          else { espera = Math.max(espera, ms || 30000); log(`${modelo}: cuota por minuto (429), esperaré ${Math.round((ms || 30000) / 1000)} s`); }
          ultimo = new Error(`${modelo}: 429`); continue;
        }
        if (!r.ok) { ultimo = new Error(`${modelo}: HTTP ${r.status} ${txt.slice(0, 200)}`); log(ultimo.message); espera = Math.max(espera, esperaDeGoogle(txt)); continue; }
        const j = JSON.parse(txt);
        const out = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        if (!out) { ultimo = new Error(`${modelo}: respuesta vacía (${j.candidates?.[0]?.finishReason || "?"})`); log(ultimo.message); continue; }
        try {
          const res = JSON.parse(out.replace(/^\s*```(json)?|```\s*$/g, "").trim());
          log(`Gemini (${modelo}) respondió ${out.length} caracteres`);
          return res;
        } catch { ultimo = new Error(`${modelo}: JSON no válido (${out.length} caracteres)`); log(ultimo.message); continue; }
      } catch (e) {
        ultimo = e; log(`${modelo}: ${e.name === "TimeoutError" ? "sin respuesta a tiempo" : e.message}`);
      }
    }
    const pausa = Math.min(Math.max(espera, Math.min(30000 * ronda, 60000)), 90000, fin - Date.now() - 15000);
    if (pausa <= 0) break;
    log(`Ronda ${ronda} sin éxito; espero ${Math.round(pausa / 1000)} s y vuelvo a probar`);
    await dormir(pausa);
  }
  throw ultimo || new Error("Gemini no respondió a tiempo");
}
