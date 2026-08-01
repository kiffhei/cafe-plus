#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const COFFEE_ACCENT = '#C9863D'
const COFFEE_ACCENT_DEEP = '#A8672A'
const CLAUDE_CORAL = '#D97757'

const STATUS_META = {
  done: { label: 'Completo', icon: '✓' },
  pending: { label: 'Pendiente', icon: '○' },
}

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Parsea la sección "## Estado de tareas" de un doc de tareas: una línea
// - [x]/[ ] por item de nivel superior (DEV1, DT1, etc.), ya resumida ahí por
// el propio proyecto — no hay que re-derivarla de las secciones detalladas.
function parseTaskSummary(filePath, sectionLabel) {
  const content = readSafe(filePath)
  if (!content) return []
  const items = []
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*-\s\[( |x)\]\s*(.+)$/i)
    if (!m) continue
    const done = m[1].toLowerCase() === 'x'
    const rest = m[2].trim()
    const titleMatch = rest.match(/^([A-Z]+\d+)\s*[·:-]?\s*(.+)$/)
    items.push({
      id: titleMatch ? titleMatch[1] : rest.slice(0, 6),
      name: titleMatch ? titleMatch[2] : rest,
      section: sectionLabel,
      status: done ? 'done' : 'pending',
    })
  }
  return items
}

const PAGES = [
  { name: 'Nuevo Pedido', desc: 'POS — carrito, clientes, canales de venta' },
  { name: 'Pedidos Hoy', desc: 'Tablero de pedidos en vivo (kanban)' },
  { name: 'Historial', desc: 'Historial paginado + exportación de tickets en PDF' },
  { name: 'Análisis', desc: 'KPIs, gráficas y panel de chat con IA' },
  { name: 'Clientes', desc: 'CRM — lista de clientes y fidelización' },
  { name: 'Productos', desc: 'Catálogo de productos (CRUD)' },
  { name: 'Usuarios', desc: 'Gestión de usuarios (solo admin)' },
  { name: 'Login', desc: 'Autenticación con Clerk' },
]

function buildDashboardHtml() {
  const devItems = parseTaskSummary(path.join(ROOT, 'DEV_TASKS.md'), 'Desarrollo')
  const designItems = parseTaskSummary(path.join(ROOT, 'DESIGN_TASKS.md'), 'Diseño')
  const allItems = [...devItems, ...designItems]

  const total = allItems.length
  const done = allItems.filter((i) => i.status === 'done').length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const statTiles = [
    { label: 'Avance del proyecto', value: `${percent}%`, color: COFFEE_ACCENT },
    { label: 'Tareas completadas', value: `${done}/${total}`, color: COFFEE_ACCENT_DEEP },
    { label: 'Páginas del sistema', value: String(PAGES.length), color: '#8A5FDB' },
    { label: 'Temas visuales', value: '7', color: '#2FAA55' },
  ]

  const itemRows = allItems
    .map((item) => {
      const meta = STATUS_META[item.status]
      return `
      <li class="clip-row" data-status="${item.status}">
        <span class="clip-swatch" style="background:${item.status === 'done' ? COFFEE_ACCENT : 'rgba(255,255,255,0.15)'}"></span>
        <div class="clip-info">
          <div class="clip-head">
            <span class="clip-name">${escapeHtml(item.id)} · ${escapeHtml(item.name)}</span>
            <span class="clip-status status-${item.status}">${meta.icon} ${meta.label}</span>
          </div>
          <p class="clip-desc">${escapeHtml(item.section)}</p>
        </div>
      </li>`
    })
    .join('')

  const statTilesHtml = statTiles
    .map(
      (s) => `
      <div class="stat-tile">
        <span class="stat-dot" style="background:${s.color}"></span>
        <span class="stat-value">${escapeHtml(s.value)}</span>
        <span class="stat-label">${escapeHtml(s.label)}</span>
      </div>`
    )
    .join('')

  const pageChips = PAGES.map((p) => `<span class="genre-chip" title="${escapeHtml(p.desc)}">${escapeHtml(p.name)}</span>`).join('')

  const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Café+ — Estado del proyecto</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #2e2622;
    --surface: #362d27;
    --surface-raised: #423630;
    --border: rgba(255,255,255,0.12);
    --text-primary: #f2ede8;
    --text-secondary: #c9bcb0;
    --text-muted: #8f8177;
    --accent: ${COFFEE_ACCENT};
    --claude-coral: ${CLAUDE_CORAL};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem;
    background-color: var(--bg);
    color: var(--text-primary);
    font-family: -apple-system, "Inter", system-ui, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  .eyebrow { display: block; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); margin-bottom: 0.5rem; }
  h1 { font-size: 1.6rem; margin: 0 0 0.3rem; font-weight: 700; }
  .subtitle { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem; }

  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.9rem; margin-bottom: 1.75rem; }
  .stat-tile { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.1rem 1.15rem; display: flex; flex-direction: column; gap: 0.35rem; transition: transform 150ms ease, background 150ms ease; }
  .stat-tile:hover { transform: translateY(-2px); background: var(--surface-raised); }
  .stat-dot { width: 10px; height: 10px; border-radius: 3px; }
  .stat-value { font-size: 1.75rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 0.82rem; color: var(--text-secondary); font-weight: 500; }

  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem; }
  .panel h2 { margin: 0 0 1.1rem; font-size: 1.15rem; display: flex; align-items: center; gap: 0.65rem; font-weight: 700; }
  .panel h2::before { content: ''; width: 9px; height: 9px; border-radius: 3px; background: var(--accent); display: inline-block; }

  .filters { display: flex; gap: 0.6rem; margin-bottom: 1.1rem; flex-wrap: wrap; }
  .filter-btn { background: var(--surface-raised); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 7px; padding: 0.5rem 1rem; font-size: 0.86rem; font-weight: 600; cursor: pointer; transition: background 120ms ease, color 120ms ease, border-color 120ms ease; }
  .filter-btn:hover { color: var(--text-primary); }
  .filter-btn.active { background: var(--accent); color: #2a1a0c; border-color: var(--accent); }

  .clip-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
  .clip-row { display: flex; gap: 1rem; align-items: flex-start; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 9px; padding: 0.9rem 1.1rem; transition: transform 150ms ease, border-color 150ms ease; }
  .clip-row:hover { transform: translateX(3px); border-color: rgba(255,255,255,0.28); }
  .clip-row.hidden { display: none; }
  .clip-swatch { width: 11px; align-self: stretch; border-radius: 3px; flex-shrink: 0; min-height: 40px; }
  .clip-info { flex: 1; min-width: 0; }
  .clip-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .clip-name { font-size: 1rem; font-weight: 700; }
  .clip-status { font-size: 0.76rem; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; white-space: nowrap; }
  .status-done { background: rgba(47,170,85,0.18); color: #7fe0a0; }
  .status-pending { background: rgba(255,255,255,0.1); color: var(--text-muted); }
  .clip-desc { margin: 0.3rem 0 0; font-size: 0.85rem; color: var(--text-secondary); }

  .genre-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .genre-chip { background: var(--surface-raised); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 999px; padding: 0.35rem 0.85rem; font-size: 0.78rem; font-weight: 500; }

  .toolbar { display: flex; justify-content: flex-end; gap: 0.6rem; margin-bottom: 1.25rem; }
  .toolbar-btn { display: inline-flex; align-items: center; gap: 0.45rem; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 150ms ease, transform 120ms ease; }
  .toolbar-btn:hover { background: var(--surface-raised); }
  .toolbar-btn:active { transform: scale(0.97); }
  .toolbar-icon { width: 16px; height: 16px; flex-shrink: 0; }
  #refresh-btn .toolbar-icon { transition: transform 500ms ease; }
  #refresh-btn.refreshing .toolbar-icon { animation: spin 700ms linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); align-items: center; justify-content: center; z-index: 50; }
  .modal-backdrop.open { display: flex; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; width: min(480px, 90vw); }
  .modal h3 { margin: 0 0 0.5rem; font-size: 1.05rem; }
  .modal-hint { margin: 0 0 0.9rem; font-size: 0.82rem; color: var(--text-secondary); }
  .modal textarea { width: 100%; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-family: inherit; font-size: 0.88rem; padding: 0.7rem 0.85rem; resize: vertical; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem; }
  .submit-btn { background: var(--accent); color: #2a1a0c; border: none; border-radius: 8px; padding: 0.55rem 1.1rem; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: transform 120ms ease; }
  .submit-btn:active { transform: scale(0.97); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .modal-status { margin: 0.75rem 0 0; font-size: 0.8rem; color: var(--text-secondary); min-height: 1.1em; }
  .modal-status.error { color: #ff8a8a; }
  .modal-status.success { color: #7fe0a0; }

  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="toolbar-btn" id="refresh-btn" type="button" aria-label="Actualizar dashboard">
      <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v6h-6"/></svg>
      Actualizar
    </button>
    <button class="toolbar-btn" id="feedback-open-btn" type="button" aria-label="Dejar un comentario">
      <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4A9 9 0 0 1 3 12a8.4 8.4 0 0 1 13.1-6.9A8.4 8.4 0 0 1 21 11.5Z"/><path d="M8 10h8M8 14h5"/></svg>
      Comentarios
    </button>
  </div>

  <span class="eyebrow">Sistema POS + CRM con IA</span>
  <h1>Café+</h1>
  <div class="subtitle">Estado del proyecto · Generado: ${generatedAt}</div>

  <div class="stats">${statTilesHtml}</div>

  <div class="panel">
    <h2>Progreso por tarea</h2>
    <div class="filters">
      <button class="filter-btn active" data-filter="all">Todo</button>
      <button class="filter-btn" data-filter="done">Completo</button>
      <button class="filter-btn" data-filter="pending">Pendiente</button>
    </div>
    <ul class="clip-list" id="clip-list">${itemRows}</ul>
  </div>

  <div class="panel">
    <h2>Páginas del sistema</h2>
    <div class="genre-grid">${pageChips}</div>
  </div>

  <div class="modal-backdrop" id="feedback-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <h3 id="feedback-title">Dejar un comentario</h3>
      <p class="modal-hint">¿Encontraste un bug o tienes una sugerencia? Se guarda para revisarlo en la próxima actualización.</p>
      <textarea id="feedback-text" rows="5" placeholder="Escribe aquí lo que notaste..." maxlength="2000"></textarea>
      <div class="modal-actions">
        <button class="toolbar-btn modal-cancel" id="feedback-cancel-btn" type="button">Cancelar</button>
        <button class="submit-btn" id="feedback-submit-btn" type="button">Enviar</button>
      </div>
      <p class="modal-status" id="feedback-status"></p>
    </div>
  </div>

  <script>
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        const filter = btn.getAttribute('data-filter')
        document.querySelectorAll('.clip-row').forEach((row) => {
          const match = filter === 'all' || row.getAttribute('data-status') === filter
          row.classList.toggle('hidden', !match)
        })
      })
    })

    const refreshBtn = document.getElementById('refresh-btn')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('refreshing')
        refreshBtn.disabled = true
        setTimeout(() => { window.location.reload() }, 350)
      })
    }

    const feedbackBackdrop = document.getElementById('feedback-backdrop')
    const feedbackOpenBtn = document.getElementById('feedback-open-btn')
    const feedbackCancelBtn = document.getElementById('feedback-cancel-btn')
    const feedbackSubmitBtn = document.getElementById('feedback-submit-btn')
    const feedbackText = document.getElementById('feedback-text')
    const feedbackStatus = document.getElementById('feedback-status')

    function closeFeedback() {
      feedbackBackdrop.classList.remove('open')
      feedbackText.value = ''
      feedbackStatus.textContent = ''
      feedbackStatus.className = 'modal-status'
    }

    if (feedbackOpenBtn) {
      feedbackOpenBtn.addEventListener('click', () => {
        feedbackBackdrop.classList.add('open')
        feedbackText.focus()
      })
      feedbackCancelBtn.addEventListener('click', closeFeedback)
      feedbackBackdrop.addEventListener('click', (e) => {
        if (e.target === feedbackBackdrop) closeFeedback()
      })
      feedbackSubmitBtn.addEventListener('click', () => {
        const text = feedbackText.value.trim()
        if (!text) {
          feedbackStatus.textContent = 'Escribe algo antes de enviar.'
          feedbackStatus.className = 'modal-status error'
          return
        }
        feedbackSubmitBtn.disabled = true
        feedbackStatus.textContent = 'Enviando...'
        feedbackStatus.className = 'modal-status'
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
          .then((r) => r.json())
          .then((data) => {
            feedbackSubmitBtn.disabled = false
            if (data.ok) {
              feedbackStatus.textContent = '¡Gracias! Tu comentario fue recibido.'
              feedbackStatus.className = 'modal-status success'
              setTimeout(closeFeedback, 1600)
            } else {
              feedbackStatus.textContent = 'No se pudo guardar. Intenta de nuevo.'
              feedbackStatus.className = 'modal-status error'
            }
          })
          .catch(() => {
            feedbackSubmitBtn.disabled = false
            feedbackStatus.textContent = 'No se pudo conectar — abre este dashboard desde el lanzador (server.js), no como archivo estático.'
            feedbackStatus.className = 'modal-status error'
          })
      })
    }
  </script>
</body>
</html>`
}

function generate() {
  const html = buildDashboardHtml()
  fs.writeFileSync(path.join(__dirname, 'dashboard.html'), html)
  console.log('Dashboard generado en:', path.join(__dirname, 'dashboard.html'))
}

module.exports = { buildDashboardHtml }

if (require.main === module) {
  generate()
}
