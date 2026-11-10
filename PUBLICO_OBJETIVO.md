# PUBLICO_OBJETIVO.md — Café+

> Estado global: **[PROPUESTA]** — sin estudio de mercado ni analítica real detrás (proyecto
> de portafolio que simula una cafetería; los datos de clientes en BD son sintéticos/de prueba).
> Lo que sí es `[DOCUMENTADO]` son las reglas de negocio reales del programa de lealtad
> (`src/lib/descuentos.js`, `Codigo.gs`), porque definen literalmente qué recibe cada cliente.
> Fecha: 2026-10-06.

**Conclusión en una línea:** quien recibe este correo es un cliente recurrente de una
cafetería de barrio que ya volvió lo suficiente para acumular años de registro — y lo que
lo hace abrir el correo no es la fecha, es el regalo concreto que ya ganó.

---

## 1. Lo documentado vs. lo propuesto

- `[DOCUMENTADO]` — Mecánica real del programa de lealtad (`descuentos.js`):
  regalo por visitas acumuladas (5/10/15 → café, muffin, 2 cafés), descuento de
  cumpleaños (30% el día, 5% el resto del año), regalo de aniversario de registro
  (pan o sandwich a elección, 1 vez por año cumplido, sin importar cuántos años).
- `[DOCUMENTADO]` — Canal: correo transaccional vía n8n + Gmail, disparado por cron a
  7/1/0 días del aniversario.
- `[TBD]` — No existe estudio de mercado, encuestas ni analítica de apertura/click de
  correos (no hay tracking de email implementado).
- `[PROPUESTA]` — Todo el perfil demográfico y de comportamiento de abajo: se infiere
  del tipo de negocio (cafetería de barrio con CRM de lealtad) y de patrones típicos de
  ese tipo de clientela, no de datos propios de Café+.

---

## 2. Núcleo común

| Campo | Contenido | Estado |
|---|---|---|
| Relación con la categoría | Cliente recurrente de una cafetería física de barrio, no ocasional | `[PROPUESTA]` |
| Lo que quieren ganar | Sentir que su lealtad se nota y se premia, sin tener que pedirlo | `[PROPUESTA]` |
| Lo que los frena a abrir un correo de "aniversario" | Suena a notificación automática genérica, no a algo para ellos | `[PROPUESTA]` |
| Tono que compran | Cálido, directo, de barrio — como si el barista les hablara, no el sistema | `[PROPUESTA]` |
| Tono que los expulsa | Corporativo, con jerga de "programa de fidelización", frío | `[PROPUESTA]` |

---

## 3. Segmentos

### Segmento A — "El de la orden de siempre"
| Campo | Contenido |
|---|---|
| Arquetipo dominante | El habitual — rutina diaria/semanal, pide lo mismo |
| Peso estimado | Alto `[PROPUESTA]` |
| Quién es / situación | Va a Café+ en su ruta diaria (trabajo, casa). Ya conoce al cajero. |
| Lo que quiere ganar | Que ese hábito se note — un gesto, no un descuento genérico |
| Dolores | Le irrita que una app "de lealtad" solo le mande spam de promociones que no le aplican |
| Objeciones a la acción (abrir/actuar sobre el correo) | "Es un correo automático más, lo voy a ignorar" |
| Disparador | Ver de entrada qué gana, sin tener que leer para enterarse |
| Dónde está | Bandeja de Gmail, revisa rápido en el celular |
| Qué le sirve | Asunto corto con el beneficio, cuerpo breve, un solo gancho visual |
| Estado | `[PROPUESTA]` |

### Segmento B — "El que viene por ocasión"
| Campo | Contenido |
|---|---|
| Arquetipo dominante | El ocasional con intención — café de trabajo, reunión, antojo de fin de semana |
| Peso estimado | Medio `[PROPUESTA]` |
| Quién es / situación | Visita con menos frecuencia pero lleva años yendo ahí cuando le toca |
| Lo que quiere ganar | Un pretexto concreto para volver pronto (el regalo como excusa) |
| Dolores | Se le olvida la app existe entre visita y visita |
| Objeciones | "No sé ni cuánto llevo yendo, ¿esto aplica a mí?" |
| Disparador | Que el correo le diga exactamente cuántos años y qué gana, sin ambigüedad |
| Dónde está | Correo, revisa con más calma que el habitual |
| Qué le sirve | Mencionar el número de años como logro compartido ("llevas X años con nosotros") |
| Estado | `[PROPUESTA]` |

> Café+ no tiene un segundo lado de negocio (no hay oferta/demanda tipo marketplace) —
> no aplica la separación en familias.

---

## 4. Lenguaje: lo que compran y lo que no

| Idea | Se dice así | No se dice así | Por qué |
|---|---|---|---|
| El regalo | "Tu [producto] gratis te espera" | "Tienes un beneficio disponible en tu cuenta" | Concreto > abstracto; "beneficio" suena a banco |
| El tiempo como cliente | "Llevas 3 años con nosotros" | "Felicidades por tu aniversario de registro" | "Registro" es lenguaje de sistema, no de barra de café |
| El llamado a la acción | "Pásate por él cuando quieras" | "Haz clic aquí para canjear tu recompensa" | Sin fricción de app bancaria/loyalty corporativo |
| El remitente | Voz de Café+ como negocio de barrio | Voz de "el sistema" o "n8n" | El pie actual dice "enviado automáticamente con n8n" — rompe el tono, ver nota abajo |

**Palabras y estéticas prohibidas:** "programa de fidelización", "beneficio", "canjear",
"recompensa" (suena a banco/aerolínea), cualquier tono de urgencia falsa ("¡no te lo
pierdas!", countdown), firma visible de la herramienta (n8n) en el cuerpo del correo.

---

## 5. Canales y momento

| Canal | Segmentos | Rol | Momento |
|---|---|---|---|
| Correo (Gmail vía n8n) | A y B | Único canal transaccional activo | 7 días antes (aviso temprano), 1 día antes (recordatorio), día 0 (celebración) | `[DOCUMENTADO]` el disparo, `[PROPUESTA]` el rol de cada ventana |

A los 7 días el gancho debe ser "ya casi" (anticipación del regalo); al día 0, "hoy lo
puedes reclamar". El copy actual no distingue tono entre las tres ventanas — oportunidad
de mejora fuera del alcance de este pedido puntual.

---

## 6. Objeciones transversales

| Objeción | Ángulo de respuesta | Guarda |
|---|---|---|
| "¿Por qué me llega esto?" | Responderla en la primera línea visible, no enterrada | — |
| "¿Esto es spam/automatizado?" | Tono de barra de café, no de sistema; quitar la firma de n8n del cuerpo visible | `[TBD]` si legal/Brian quiere mantener el crédito de n8n en el pie técnico |
| "¿Qué gano exactamente?" | Nombrar el regalo específico en el asunto, no solo "aniversario" | Requiere que el asunto also mencione el premio — hoy no lo hace |

---

## 7. Mapa a arquetipos

| Segmento | Arquetivo | Qué le habla |
|---|---|---|
| A — habitual | El habitual | Reconocimiento del hábito, brevedad |
| B — ocasional | El que vuelve por ocasión | El número de años como logro, pretexto claro para volver |

---

## 8. [NO ASUMIR]

- No hay dato real de tasa de apertura o conversión de este correo (no hay tracking).
- No asumir que "pan o sandwich a elección" es el regalo más deseado — es el único que
  existe en el sistema hoy (`descuentos.js`), no una preferencia validada con clientes.
- No asumir que todos los clientes prefieren tono informal — es hipótesis, no dato.

## 9. Checklist de validación

- [ ] Si Café+ fuera un negocio real: encuesta corta a 10-15 clientes sobre qué los
      haría abrir un correo de este tipo.
- [ ] Revisar con Brian si el crédito "enviado con n8n" se queda en el pie o se quita
      del cuerpo visible del correo.
- [ ] Si se activa tracking de email en el futuro, usar aperturas reales para subir
      este documento de `[PROPUESTA]` a `[DOCUMENTADO]`.
- [ ] Confirmar si el asunto debe mencionar el regalo específico (cambio de alcance
      sobre el nodo "Edit Fields" actual, que hoy no lo hace).
