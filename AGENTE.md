# Instrucciones del agente de cenas

Este repositorio es una web app de cocina para un iPad mini 2 (Safari de iOS 12) que hay en la cocina. Se publica con GitHub Pages en http://redpolasapps.fyi/cenas/.
Cada día el agente escribe **el plan del día (`plan/`)**. En modo completo, también `data.js` y `recetas/historial.json`. No toques `index.html`, `platos.js`, `scripts/` ni `.github/`.


> **`familia.json`** guarda lo propio de cada casa (ciudad, edad del peque, raciones, gustos, cosas a evitar y alergias). Si algo de este documento sobre gustos, edad o raciones lo contradice, **manda `familia.json`**.

## Cómo se reparte el trabajo

- **Claude decide** (pocas palabras): qué 6 cenas, cuáles se repiten del recetario, el equilibrio de la semana, la explicación, el tipo de cocina, cuál es para el peque y cuál de capricho. Lo escribe como **plan** en `plan/AAAA-MM-DD.json`.
- **Gemini redacta** (lo pesado): al subir un plan, GitHub Actions (`.github/workflows/expandir.yml` → `scripts/expandir.mjs`) le pide a Gemini los **ingredientes y los pasos detallados** de las recetas nuevas. También busca las fotos en Pexels (si existe el secreto `PEXELS_API_KEY`) o, si no, en Wikimedia Commons, que no necesita clave; escribe `data.js` y actualiza `recetas/historial.json`. Necesita el secreto `GEMINI_API_KEY` en el repositorio.
- **Modo plan (el normal):** sigue los pasos de abajo para decidir, pero **no escribas `ingredientes` ni `pasos` y no busques fotos**. Escribe solo el plan.
- **Fotos que falten (después de la Action):** si alguna receta de `data.js` se queda sin `foto`, Claude lanza un subagente con el modelo **Sonnet** (más barato) que solo busca fotos, siguiendo la sección "Fotos reales" (solo WebSearch, como mucho 2 búsquedas por receta, Pexels con `w=600`). Rellena `foto` y `fotoCredito` en `data.js` y en la misma receta de `recetas/historial.json`, sin tocar nada más.
- **Emergencia sin Claude:** cada día a las 06:15 UTC (07:15 en Madrid en invierno), `.github/workflows/emergencia.yml` comprueba si la web tiene las cenas de hoy. Si no las tiene (por ejemplo, porque Claude se ha quedado sin cuota), `scripts/emergencia.mjs` hace que **Gemini decida el plan** con las reglas de este documento, lo valida y lo redacta. Esos planes llevan `"autor": "gemini (emergencia)"`.
- **Modo completo (reserva):** si la Action falla, Claude escribe `data.js` y el recetario él mismo, con todo, siguiendo el resto de este documento.

### Formato del plan (`plan/AAAA-MM-DD.json`)

```json
{
  "fecha": "2026-11-20",
  "hoy": {
    "cole": { "platos": ["..."], "nota": "..." },
    "consejo": "...",
    "explicacion": "...",
    "cenas": [
      { "reutilizar": "id-de-una-receta-del-recetario", "porque": "opcional: por qué encaja hoy" },
      {
        "id": "slug-unico-nuevo", "titulo": "...", "subtitulo": "...", "cocina": "Mediterránea", "imagen": "pescado",
        "peques": false, "healthy": true, "gourmet": false, "airfryer": false, "rapida": false, "tiempo": 30, "dificultad": "Fácil", "raciones": 3,
        "plato": { "verdura": 50, "proteina": 30, "hidratos": 20 },
        "porque": "...", "truco": "...", "etiquetas": ["Pescado", "Horno"],
        "guia": "Una o dos frases para el redactor: ingredientes principales, técnica y cualquier detalle que no deba cambiar (p. ej. 'merluza en lomos sin espinas al horno sobre cama de patata en rodajas finas y pimiento rojo; salsa de limón aparte').",
        "busqueda_foto": "baked hake with potatoes"
      }
    ]
  },
  "finde": null
}
```

- En `cenas` van las 6, en orden: la sexta es la de capricho. Cada una es o bien `{"reutilizar": "<id>"}` (receta del recetario, se copia con sus pasos y su foto), o bien una receta nueva con todos los campos de arriba, **sin** `ingredientes` ni `pasos`.
- Un `id` nuevo no puede existir ya en el recetario: si el plato ya está, usa `reutilizar`.
- `busqueda_foto`: 2 a 4 palabras en inglés que describan el plato, para buscar en Pexels.
- `finde`: `null` si no toca rehacerlo. Si toca (el fin de semana anterior ya ha pasado, normalmente el lunes), un objeto `{"fechas": "Sábado 28 y domingo 29 de noviembre", "comidas": [ ... ]}` con 4 bloques `{"dia": "Sábado", "momento": "Comida", "fecha": "2026-11-28", "opciones": [3 recetas como las de arriba]}`.
- Valida que el plan es JSON correcto y haz commit y push (`Plan AAAA-MM-DD`). La Action tarda unos minutos.

## Leer el recetario sin gastar (importante)

- **No leas nunca `recetas/historial.json` entero**: tiene todas las recetas con sus pasos y crece cada día.
- Para decidir qué repetir, ejecuta **`node scripts/candidatas.mjs`**: muestra en una línea por receta solo las que se pueden repetir hoy (más de 14 días sin salir), como mucho 60, empezando por las que llevan más tiempo sin salir. Normalmente con eso basta.
- Si necesitas más detalle, está **`recetas/indice.json`**: una línea por receta con `id`, `titulo`, `cocina`, `peques`, `healthy`, `gourmet`, `airfryer`, `rapida`, `etiquetas`, `momentos`, `primera` y `ultima` (fechas), `veces` y si tiene `foto`. Está ordenado de más reciente a más antiguo.
- Si necesitas ver o cambiar una receta concreta, sácala con node sin imprimir el resto. Por ejemplo: `node -e "const h=require('./recetas/historial.json');console.log(JSON.stringify(h.recetas.find(r=>r.id==='ID'),null,1))"`.
- Para comprobar `data.js`, usa un `node -e` que imprima solo lo necesario (fecha, plan, títulos), no el archivo entero.
- En modo completo, después de tocar `historial.json`, regenera el índice con `node scripts/expandir.mjs --indice`.

## Qué hacer en cada ejecución

1. Mira la fecha de hoy en Europe/Madrid.
   - Las favoritas (❤️) se guardan solo en el aparato de cada persona, porque la app la usan varias casas. El agente no las ve: elige del recetario según su propio criterio.
2. Lee el menú del colegio en `menus/AAAA-MM.json` (por ejemplo, `menus/2026-11.json`), en la clave `dias["AAAA-MM-DD"].platos`.
   - Si hoy es lunes a viernes y está en el menú, rellena `hoy.cole.platos` con esos platos y pon `hoy.cole.nota` si existe.
   - Si es sábado o domingo, festivo o no hay menú para hoy, deja `hoy.cole` como `{}`. La app mostrará "Hoy no hay cole". Si no existe el archivo del mes, haz lo mismo y añade en `hoy.consejo` que falta el menú del mes y hay que pasárselo al agente.
3. Escribe `hoy.consejo`, una frase que diga qué ha comido al mediodía (tipo de proteína, legumbre, etc.) y qué conviene cenar para completar el día.
4. **Equilibrio semanal (solo de lunes a viernes).** Antes de elegir las cenas, mira el menú del cole de toda la semana en curso (de lunes a viernes) y las cenas que ya hay en `data.js`. Intenta que entre cole y casa la semana se acerque a estas pautas para un niño:
   - pescado 3 o 4 veces;
   - legumbre 3 o 4 veces;
   - huevo de 3 a 4 veces;
   - carne roja como mucho 1 o 2 veces;
   - verdura en todas las comidas y cenas, y fruta a diario.
   Prioriza en las cenas lo que falte esa semana y evita lo que ya esté cubierto.
   - **Semanas incompletas:** puede faltar el menú de algunos días. Pasa cuando la semana empieza en un mes y acaba en otro y aún no está el archivo del mes nuevo, en festivos, en vacaciones o cuando el menú no trae ese día. Cuenta solo los días que sí estén en `menus/` y **no te inventes nunca lo que ha comido un día sin menú**. Ajusta las pautas a los días que haya: con 2 días conocidos no hace falta llegar a 3 de pescado. Dilo en `hoy.explicacion` (por ejemplo, "solo tengo el menú de 3 días de esta semana").
   - Si un mes empieza a mitad de semana, mira también el archivo del mes anterior o del siguiente para completar la semana, si existe.
   Escribe en `hoy.explicacion` un párrafo corto (2 o 3 frases, tono cercano) que explique por qué propones estas cenas: qué ha comido hoy, cómo va la semana (por ejemplo, "esta semana lleva 2 de pescado y 3 de legumbre") y qué buscan las cenas. La app lo muestra debajo de las recetas.
5. Propón **6 cenas** en `hoy.cenas` (la app las muestra en 2 filas de 3):
   - **En casa hay un niño de 4 años que no come de todo.** Todas las cenas tienen que poder comerlas él y los adultos:
     - Sin picante, con poca sal y con sabores suaves.
     - Nada de frutos secos enteros, uvas o tomates cherry enteros, ni trozos duros.
     - Pescado sin espinas y carne sin huesos pequeños.
   - **Al menos dos de las 6 tienen que ser "seguras" para el peque:** un formato que suelen aceptar todos los niños (tortilla, croquetas, albóndigas, pasta, crema con quesito, rebozados al horno, hamburguesitas, mini pizzas, nuggets caseros, quesadillas…), con la verdura escondida o en trocitos pequeños. Márcalas con `"peques": true`.
   - En cada receta, añade `"truco"`: una frase para que el niño se la coma (cómo presentarla, cómo esconder la verdura, cómo hacer que participe o cómo servirle su parte aparte). Por ejemplo: "Tritura la verdura en la salsa" o "Que él ponga el queso por encima".
   - **Exactamente una de las 6 se cocina toda o casi toda en la air fryer (freidora de aire)** → `"airfryer": true`. Puede ser a la vez healthy, peques, gourmet o ninguna de ellas: **varía de un día a otro** (un día la healthy, otro una casera, otro la del peque…). En su `guia` di qué parte va a la air fryer, a qué temperatura y cuántos minutos. Si reutilizas del recetario, mira el campo `airfryer` del índice.
   - **Lunes, miércoles y viernes, una de las 6 es "súper rápida"** → `"rapida": true`: sana, que encaje con el menú del cole y lista en 10–15 minutos con productos ya preparados, para una noche de mucho cansancio. Ejemplos: caldo envasado a la olla con fideos (10 min); brócoli o judías de bolsa al microondas con aceite, sal y un huevo a la plancha; legumbre de bote salteada con verdura y atún; tortilla francesa con tomate y pan integral. Como mucho 5 pasos. Puede ser también healthy o peques. Los demás días, ninguna.
   - **Al menos dos de las 6 tienen que ser "healthy"**: más proteína y verdura, y poco hidrato (sin pasta, arroz, pan ni patata como base, o en poca cantidad). Por ejemplo: pescado o pollo a la plancha o al horno con verduras, tortillas de verdura, revueltos, ensaladas templadas con proteína, cremas de verdura con huevo o pollo, o brochetas. Tienen que seguir siendo aptas y apetecibles para un niño de 4 años: texturas suaves y sabores sencillos. Márcalas con `"healthy": true`. Una cena puede ser a la vez `peques` y `healthy`. La de capricho no cuenta como healthy.
   - Fáciles (30 minutos o menos y pocos cacharros), equilibradas y ricas.
   - **La sexta (la última) es la opción "capricho":** una receta más elaborada y algo gourmet, para los días en que haya más ganas de cocinar. Puede llevar hasta 45–60 minutos, con algún ingrediente o técnica especial (un buen pescado o carne, una salsa, un horneado o un emplatado bonito), pero siempre factible en casa. Márcala con `"gourmet": true` y explica en `truco` cómo servirle al niño una versión que se coma (por ejemplo, la salsa aparte).
   - **Compensa el mediodía.** Si hubo legumbre y carne, cena pescado o huevo. Si hubo pescado, cena huevo o carne blanca. Si hubo mucho hidrato, cena poco. Siempre mucha verdura.
   - Las 6 tienen que ser distintas entre sí: usa proteínas diferentes y técnicas diferentes (horno, sartén, olla).
   - No repitas recetas que aparezcan en el `data.js` actual (`hoy.cenas`). Así se evita repetir lo de ayer.
   - **Recetario (consúltalo en `recetas/indice.json`):** la prioridad es **crear recetas nuevas**, para que el recetario vaya creciendo. De las 6 cenas, **como mucho 2** pueden salir del recetario, y es perfectamente válido que no salga ninguna.
     - Solo puedes reutilizar una receta si han pasado **al menos 14 días (2–3 semanas) desde la última vez que salió** (campo `ultima` del índice) y si encaja con el día.
     - Elige tú cuáles repetir, según lo que mejor encaje con el menú y la semana. Prefiere las que salieron hace más tiempo o las que tuvieron buena pinta (fáciles, aptas para el peque).
     - Una receta reutilizada se copia tal cual del recetario (mismo `id`, pasos y foto). Así no hay que volver a buscar la foto ni a escribirla. Mira antes que tenga el formato actual (pasos detallados con `usa`, `cocina`, etc.). Si le falta algo, complétalo.
     - Antes de crear una receta nueva, comprueba que no exista ya una igual o casi igual en el recetario (mismo plato con otro nombre). Si existe, reutilízala en vez de duplicarla.
   - **Gustos de la familia:**
     - **Sobre todo cocina mediterránea:** arroces, pasta, legumbres, verduras al horno o a la plancha, pescados, tortillas, cremas, guisos caseros…
     - **De vez en cuando, algo exótico pero fácil.** Les gusta lo japonés (yakisoba, yakitori, pollo teriyaki, donburi, gyozas compradas a la sartén) y lo americano (hamburguesas caseras, wraps, sándwiches, BBQ). Como mucho 1 de las 6 cenas de cada día, y que sea sencillo: **nada de sushi** ni recetas que pidan técnicas o ingredientes difíciles de encontrar.
     - **Evita la cocina nórdica, alemana o centroeuropea** (salchichas con chucrut, platos con nata y patata muy pesados, etc.), porque no suele gustarles.
   - Ingredientes de supermercado normal y 3 raciones por defecto.
   - Los días sin cole (sábado y domingo) también son libres. Copia en `hoy.cenas` las opciones de cena de ese día que haya en `finde`, y completa hasta 6 opciones (con al menos dos `"peques": true`).
6. **Solo cuando el fin de semana de `finde` ya haya pasado** (normalmente, la primera ejecución del lunes), prepara `finde` para el sábado y domingo siguientes. Se considera pasado si `finde.hasta` (o, si no existe, la fecha del domingo que aparece en `finde.fechas`) es anterior a hoy. **El resto de días no se toca**: el plan del fin de semana se prepara una sola vez por semana, el lunes, para que dé tiempo a planificar la compra.
   - `fechas`: por ejemplo, "Sábado 21 y domingo 22 de noviembre".
   - `comidas`: 4 bloques en este orden: Sábado Comida, Sábado Cena, Domingo Comida y Domingo Cena. Cada uno lleva **3 `opciones`** (la app las muestra en una fila de 3).
   - Los gustos de la familia (mediterráneo, algo de japonés y americano fácil, nada nórdico ni alemán) también valen para el fin de semana.
   - **El fin de semana es libre:** no apliques el equilibrio semanal ni compenses lo del cole. Propón platos ricos y apetecibles para toda la familia, incluidos los típicos de fin de semana (paella, pizza casera, hamburguesas, asados, guisos…). Pueden ser algo más elaborados (de hasta 60 minutos). Valen las mismas reglas del niño de 4 años, y en cada bloque al menos una opción lleva `"peques": true`. **La tercera opción de cada bloque es la de capricho** (más elaborada y gourmet, con `"gourmet": true`), con las mismas reglas que la sexta cena entre semana.
   - La lista de la compra la monta la app **por receta** a partir de `ingredientes`. Escribe los ingredientes con cantidades concretas ("3 calabacines", "200 g de queso rallado"), un ingrediente por línea. Ya no hace falta rellenar `compra`: déjalo como `[]`.
   - En el fin de semana, como mucho 1 opción por bloque puede salir del recetario (con la misma regla de 14 días sin salir).
   - El resto de días, deja `finde` como está.
7. **Actualiza el recetario** (`recetas/historial.json`, con el formato `{"actualizado": "...", "recetas": [ ... ]}`):
   - Cada receta de `hoy.cenas` y de `finde` (si lo has rehecho) tiene que estar en `recetas`, con la receta completa más una lista `usos`.
   - Si la receta ya existe (mismo `id`), no la dupliques: añade a sus `usos` un uso `{"fecha": "AAAA-MM-DD", "dia": "Entre semana" | "Sábado" | "Domingo", "momento": "Cena" | "Comida"}`. Si ya tiene ese mismo uso, no lo repitas.
   - Si es nueva, añádela con su primer uso.
   - Las recetas de `finde` llevan como fecha la del sábado o el domingo correspondiente.
   - No borres nunca recetas del recetario.
8. Pon en `actualizado` la fecha y hora actual en ISO con zona horaria (+01:00 o +02:00).
9. Comprueba que `data.js` es JavaScript válido, por ejemplo con `node -e "global.window={};require('./data.js');console.log(Object.keys(window.MENU_DATA))"`, y que `recetas/historial.json` es JSON válido.
10. Haz commit y push a `main`. Mensaje: `Cenas AAAA-MM-DD`. Si el push es rechazado, haz `git pull --rebase` y repite.

## Formato de una receta

```json
{
  "id": "slug-unico",
  "imagen": "tortilla",
  "foto": "",
  "fotoCredito": "",
  "titulo": "Tortilla de calabacín y cebolla",
  "subtitulo": "Con ensalada de tomate",
  "tiempo": 20,
  "dificultad": "Fácil",
  "raciones": 3,
  "plato": { "verdura": 50, "proteina": 35, "hidratos": 15 },
  "porque": "Una frase de por qué encaja con lo que ha comido hoy.",
  "etiquetas": ["Huevo", "Sartén"],
  "cocina": "Española",
  "peques": true,
  "healthy": false,
  "airfryer": false,
  "rapida": false,
  "gourmet": false,
  "truco": "Córtala en triángulos pequeños y que moje en tomate.",
  "ingredientes": ["5 huevos", "2 calabacines"],
  "pasos": [
    {
      "icono": "cortar",
      "texto": "Lava los calabacines, quítales las puntas y córtalos por la mitad a lo largo. Después córtalos en medias lunas finas, de medio centímetro más o menos.",
      "usa": ["2 calabacines (unos 400 g)"],
      "consejo": "Si los cortas todos del mismo grosor, se harán a la vez."
    },
    {
      "icono": "sarten",
      "texto": "Pon una sartén grande a fuego medio con 2 cucharadas de aceite. Cuando el aceite esté caliente (se mueve como agua), añade la cebolla y el calabacín con una pizca de sal y remueve de vez en cuando.",
      "usa": ["2 cucharadas de aceite de oliva", "1 cebolla", "2 calabacines", "1 pizca de sal"],
      "fuego": "medio",
      "min": 12,
      "consejo": "Está listo cuando el calabacín esté blandito y la cebolla transparente, sin tostarse. Si se dora demasiado, baja el fuego."
    }
  ],
  "fotosUrl": ""
}
```

- `cocina`: el tipo de cocina, **uno de estos exactamente**: `Española`, `Mediterránea`, `Italiana`, `Japonesa`, `Asiática`, `Americana`, `Mexicana`, `Árabe` o `Casera`. Usa `Casera` para platos sencillos de casa sin un origen claro (por ejemplo, crema de verduras o pollo a la plancha). La app lo muestra como etiqueta en cada tarjeta.
- `plato`: los porcentajes aproximados del plato de Harvard. Tienen que sumar 100.
- `pasos`: **escritos para alguien que casi no sabe cocinar.** Usa los pasos que hagan falta, normalmente entre 6 y 12, uno por cada acción, sin juntar varias acciones difíciles en un solo paso.
  - `texto`: 1 a 3 frases claras. Explica **cómo** hacerlo: tamaño del corte, tipo de recipiente, cantidad de aceite, cuándo añadir cada cosa. No uses términos técnicos sin explicarlos: si dices "pochar", aclara "cocinar a fuego suave hasta que esté blandita y transparente".
  - `usa`: lista con **los ingredientes y cantidades exactas que se usan en ese paso** (por ejemplo, "200 g de arroz", "1 cucharada de aceite", "½ cebolla"). Si el paso no usa ingredientes, omítelo.
  - `fuego`: `"suave"`, `"medio"` o `"fuerte"` cuando el paso sea en el fuego. Para el horno, indica en el texto la temperatura y si es arriba y abajo.
  - `min`: minutos del paso, si los tiene. Activa un temporizador en la app.
  - `consejo`: opcional, una aclaración útil: cómo saber que está hecho (color, textura, que el cuchillo entre fácil), qué hacer si algo sale mal o un truco de seguridad.
  - `icono`: uno de estos: `cortar`, `sarten`, `horno`, `olla`, `mezclar`, `emplatar`, `envolver`, `lavar`.
  - El primer paso suele ser preparar: precalentar el horno, poner agua a hervir o sacar los ingredientes. El último, emplatar y servir, incluida la versión del peque.
- `ingredientes`: la lista completa con cantidades en gramos o unidades claras. Tiene que cuadrar con la suma de los `usa` de los pasos.
- `imagen`: la ilustración del plato terminado que más se parezca. Puede ser `pescado`, `tortilla`, `crema`, `arroz`, `pasta`, `pizza`, `hamburguesa`, `pollo-horno`, `garbanzos`, `sopa`, `quesadilla` o `generico`.

## Fotos reales (rápido y barato)

- **No uses nunca el navegador ni ninguna herramienta del ordenador del usuario** (Claude_Browser, Chrome, computer use, remote-devices, request_access, ni el conector de Gemini). Cada uso le pide un permiso. **Tampoco uses WebFetch** (abrir páginas web también le pide permiso). Usa solo WebSearch.
- **Las recetas reutilizadas del recetario ya traen su foto:** no busques otra.
- **Para cada receta nueva, como mucho 2 búsquedas.** Si no sale enseguida, deja la ilustración. No gastes más búsquedas: es preferible ahorrar cuota.
- Método: haz una búsqueda con WebSearch como `pexels <nombre del plato en inglés>` (por ejemplo, `pexels spinach omelette`). En los resultados, elige una foto de pexels.com cuya descripción coincida con el plato. La URL de la página (`pexels.com/photo/<descripcion>-<id>/`) trae el `<id>` y el resultado suele traer el autor. No abras la página. Si no sale el autor, pon "Pexels".
- Pon en `foto` la URL directa en tamaño reducido: `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=600`. En `fotoCredito`, "<autor> / Pexels". Las fotos no se guardan en el repositorio, solo el enlace.
- La foto tiene que corresponder de verdad al plato. Si no estás seguro, deja `foto` vacío.
- No uses fotos de blogs o webs de recetas.

## Menú del colegio

- Familia: hijo de 4 años (en noviembre de 2026). Por defecto, 3 raciones.
- El menú del colegio llega en papel, en catalán. **No escribas nunca el nombre del colegio, del niño ni datos personales en ningún archivo: el repositorio y la web son públicos.**
- Cuando el usuario mande el menú de un mes nuevo, guárdalo en `menus/AAAA-MM.json` con el mismo formato que `menus/2026-11.json`, traducido al castellano.
