# Instrucciones del agente de cenas

Este repositorio es una web app de cocina para un iPad mini 2 (Safari de iOS 12) que hay en la cocina. Se publica con GitHub Pages en http://redpolasapps.fyi/cenas/.
Cada día el agente reescribe **solo `data.js`**, salvo que se le pida otra cosa. No toques `index.html` ni `platos.js`.

## Qué hacer en cada ejecución

1. Mira la fecha de hoy en Europe/Madrid.
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
   - Fáciles (30 minutos o menos y pocos cacharros), equilibradas y ricas.
   - **La sexta (la última) es la opción "capricho":** una receta más elaborada y algo gourmet, para los días en que haya más ganas de cocinar. Puede llevar hasta 45–60 minutos, con algún ingrediente o técnica especial (un buen pescado o carne, una salsa, un horneado o un emplatado bonito), pero siempre factible en casa. Márcala con `"gourmet": true` y explica en `truco` cómo servirle al niño una versión que se coma (por ejemplo, la salsa aparte).
   - **Compensa el mediodía.** Si hubo legumbre y carne, cena pescado o huevo. Si hubo pescado, cena huevo o carne blanca. Si hubo mucho hidrato, cena poco. Siempre mucha verdura.
   - Las 6 tienen que ser distintas entre sí: usa proteínas diferentes y técnicas diferentes (horno, sartén, olla).
   - No repitas recetas que aparezcan en el `data.js` actual (`hoy.cenas`). Así se evita repetir lo de ayer.
   - **Gustos de la familia:**
     - **Sobre todo cocina mediterránea:** arroces, pasta, legumbres, verduras al horno o a la plancha, pescados, tortillas, cremas, guisos caseros…
     - **De vez en cuando, algo exótico pero fácil.** Les gusta lo japonés (yakisoba, yakitori, pollo teriyaki, donburi, gyozas compradas a la sartén) y lo americano (hamburguesas caseras, wraps, sándwiches, BBQ). Como mucho 1 de las 6 cenas de cada día, y que sea sencillo: **nada de sushi** ni recetas que pidan técnicas o ingredientes difíciles de encontrar.
     - **Evita la cocina nórdica, alemana o centroeuropea** (salchichas con chucrut, platos con nata y patata muy pesados, etc.), porque no suele gustarles.
   - Ingredientes de supermercado normal y 3 raciones por defecto.
   - Los días sin cole (sábado y domingo) también son libres. Copia en `hoy.cenas` las opciones de cena de ese día que haya en `finde`, y completa hasta 6 opciones (con al menos dos `"peques": true`).
6. **Los jueves (y siempre que `finde` sea de una semana pasada)**, rehaz `finde` para el sábado y domingo siguientes:
   - `fechas`: por ejemplo, "Sábado 21 y domingo 22 de noviembre".
   - `comidas`: 4 bloques en este orden: Sábado Comida, Sábado Cena, Domingo Comida y Domingo Cena. Cada uno lleva **3 `opciones`** (la app las muestra en una fila de 3).
   - Los gustos de la familia (mediterráneo, algo de japonés y americano fácil, nada nórdico ni alemán) también valen para el fin de semana.
   - **El fin de semana es libre:** no apliques el equilibrio semanal ni compenses lo del cole. Propón platos ricos y apetecibles para toda la familia, incluidos los típicos de fin de semana (paella, pizza casera, hamburguesas, asados, guisos…). Pueden ser algo más elaborados (de hasta 60 minutos). Valen las mismas reglas del niño de 4 años, y en cada bloque al menos una opción lleva `"peques": true`. **La tercera opción de cada bloque es la de capricho** (más elaborada y gourmet, con `"gourmet": true`), con las mismas reglas que la sexta cena entre semana.
   - La lista de la compra la monta la app **por receta** a partir de `ingredientes`. Escribe los ingredientes con cantidades concretas ("3 calabacines", "200 g de queso rallado"), un ingrediente por línea. Ya no hace falta rellenar `compra`: déjalo como `[]`.
   - El resto de días, deja `finde` como está.
7. Pon en `actualizado` la fecha y hora actual en ISO con zona horaria (+01:00 o +02:00).
8. Comprueba que `data.js` es JavaScript válido, por ejemplo con `node -e "global.window={};require('./data.js');console.log(Object.keys(window.MENU_DATA))"`.
9. Haz commit y push a `main`. Mensaje: `Cenas AAAA-MM-DD`.

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
  "gourmet": false,
  "truco": "Córtala en triángulos pequeños y que moje en tomate.",
  "ingredientes": ["5 huevos", "2 calabacines"],
  "pasos": [
    { "icono": "cortar", "texto": "Paso corto y claro, en una o dos frases." },
    { "icono": "sarten", "texto": "Si el paso tiene un tiempo, ponlo en min.", "min": 10 }
  ],
  "fotosUrl": ""
}
```

- `cocina`: el tipo de cocina, **uno de estos exactamente**: `Española`, `Mediterránea`, `Italiana`, `Japonesa`, `Asiática`, `Americana`, `Mexicana`, `Árabe` o `Casera`. Usa `Casera` para platos sencillos de casa sin un origen claro (por ejemplo, crema de verduras o pollo a la plancha). La app lo muestra como etiqueta en cada tarjeta.
- `plato`: los porcentajes aproximados del plato de Harvard. Tienen que sumar 100.
- `pasos`: de 4 a 7 pasos. `icono` es uno de estos: `cortar`, `sarten`, `horno`, `olla`, `mezclar`, `emplatar`, `envolver`, `lavar`. `min` es opcional y activa un temporizador en la app.
- `imagen`: la ilustración del plato terminado que más se parezca. Puede ser `pescado`, `tortilla`, `crema`, `arroz`, `pasta`, `pizza`, `hamburguesa`, `pollo-horno`, `garbanzos`, `sopa`, `quesadilla` o `generico`.

## Fotos reales (intenta ponerlas siempre)

- **No uses nunca el navegador ni ninguna herramienta del ordenador del usuario** (Claude_Browser, Chrome, computer use, remote-devices, request_access). Cada uso le pide un permiso. Usa solo WebSearch y WebFetch.
- **Intenta que todas las recetas lleven foto real.** El objetivo es que la mayoría la tengan. Las fotos hacen la app mucho más útil.
- Método que funciona: para cada receta, haz una búsqueda con WebSearch como `pexels <nombre del plato en inglés>` (por ejemplo, `pexels spinach omelette` o `pexels chicken nuggets`). En los resultados, elige una foto de pexels.com cuya descripción coincida con el plato. Si la búsqueda no devuelve la URL directa de la imagen, abre la página de la foto con WebFetch para sacarla y ver el autor. Pon en `foto` la URL directa (`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=800`) y en `fotoCredito` "<autor> / Pexels".
- Si Pexels no da nada que encaje, prueba con Unsplash (URL directa a `images.unsplash.com`) o con Wikimedia Commons (`upload.wikimedia.org`).
- La foto tiene que corresponder de verdad al plato (por ejemplo, una tortilla para una tortilla). Si después de 2 o 3 búsquedas no encuentras ninguna que encaje, deja `foto` vacío: la app muestra la ilustración.
- No uses fotos de blogs o webs de recetas.

## Menú del colegio

- Familia: hijo de 4 años (en noviembre de 2026). Por defecto, 3 raciones.
- El menú del colegio llega en papel, en catalán. **No escribas nunca el nombre del colegio, del niño ni datos personales en ningún archivo: el repositorio y la web son públicos.**
- Cuando el usuario mande el menú de un mes nuevo, guárdalo en `menus/AAAA-MM.json` con el mismo formato que `menus/2026-11.json`, traducido al castellano.
