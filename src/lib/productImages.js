// ── Utilidad de normalización ─────────────────────────────────────
// Elimina acentos y pasa a minúsculas para comparar nombres de forma robusta.
const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// ── Mapa de coincidencia exacta por nombre normalizado ────────────
// Tiene PRIORIDAD sobre el keyword map. Cubre todos los productos del catálogo.
const EXACT_MATCH = {
  // Cafés
  'cafe americano':      'photo-1510591509098-f4fdc8e10c4d',
  'cafe latte':          'photo-1541167760496-1628856ab772',
  'cappuccino':          'photo-1534040385115-33dcb3acba5b',
  'cafe frio':           'photo-1461023058943-07fcbe16d735',
  'cafe espresso':       'photo-1514432324607-a09d9b4aefdd',
  'frappe caramelo':     'photo-1582196016295-f8c8bd4b3a99',
  // Bebidas
  'chocolate caliente':  'photo-1542990253-0d0f5be5f0ed',
  'te verde':            'photo-1556679343-c7306c1976bc',
  'agua natural 500ml':  'photo-1548839140-29a749e1cf4d',
  // Panadería
  'croissant':           'photo-1555507036-ab1f4038808a',
  'muffin chocolate':    'photo-1571115177098-24ec42ed204d',
  'muffin blueberry':    'photo-1607478900766-efe13248b125',
  'pan de elote':        'photo-1565299624946-b28f40a0ae38',
  'pan de nuez':         'photo-1509440159596-0249088772ff',
  // Sándwiches
  'sandwich jamon':      'photo-1528735602780-2552fd46c7af',
  'sandwich caprese':    'photo-1604328698692-f76ea9498e76',
  'club sandwich':       'photo-1481070414801-51fd732d7184',
  'sandwich pollo bbq':  'photo-1598515214211-89d3c73ae83b',
}

// ── Keyword map — fallback cuando no hay exact match ─────────────
// Orden importa: específicos primero, genéricos al final.
const KEYWORD_MAP = [
  // Espresso / shots
  [['espresso', 'shot', 'ristretto', 'doble', 'concentrado'],
    'photo-1514432324607-a09d9b4aefdd'],
  // Cold brew / café frío (ANTES del genérico café)
  [['cold brew', 'cold-brew', 'café frío', 'cafe frio', 'frío', 'frio', 'hielo'],
    'photo-1461023058943-07fcbe16d735'],
  // Frappé / caramelo
  [['frappé', 'frappe', 'frapé', 'caramelo'],
    'photo-1582196016295-f8c8bd4b3a99'],
  // Americano
  [['americano'],
    'photo-1510591509098-f4fdc8e10c4d'],
  // Latte / flat white
  [['latte', 'flat white', 'vaporizada'],
    'photo-1541167760496-1628856ab772'],
  // Cappuccino
  [['cappuccino', 'capuccino', 'espuma'],
    'photo-1534040385115-33dcb3acba5b'],
  // Mocha
  [['mocha', 'moka', 'mocca'],
    'photo-1578374173705-969cbe6f2d6b'],
  // Macchiato
  [['macchiato'],
    'photo-1485808191679-5f86510bd5b8'],
  // Matcha / té verde (ANTES del genérico té)
  [['matcha', 'té verde', 'te verde'],
    'photo-1536256263959-770b48d82b0a'],
  // Té / chai
  [['té', 'te', 'tea', 'chai', 'miel'],
    'photo-1556679343-c7306c1976bc'],
  // Chocolate caliente / cacao (ANTES del genérico chocolate)
  [['chocolate caliente', 'cacao', 'artesanal'],
    'photo-1542990253-0d0f5be5f0ed'],
  // Agua
  [['agua', 'water', 'mineral', 'embotellada', 'natural'],
    'photo-1548839140-29a749e1cf4d'],
  // Limonada
  [['limonada', 'lemonade'],
    'photo-1568622503284-d6af7f2b3a66'],
  // Jugos / smoothie
  [['jugo', 'smoothie', 'licuado'],
    'photo-1622597467836-f3285f2131b8'],
  // Jamaica
  [['jamaica', 'hibisco'],
    'photo-1601055903647-ddf1ee9701b7'],
  // Genérico café (al final)
  [['café', 'cafe', 'coffee'],
    'photo-1495474472287-4d71bcdd2085'],
  // Croissant
  [['croissant', 'mantequilla'],
    'photo-1555507036-ab1f4038808a'],
  // Muffin blueberry / arándano (ANTES del genérico muffin)
  [['blueberry', 'arándano', 'arandano'],
    'photo-1607478900766-efe13248b125'],
  // Muffin chocolate (ANTES del genérico muffin)
  [['muffin chocolate', 'esponjoso'],
    'photo-1571115177098-24ec42ed204d'],
  // Muffin genérico
  [['muffin', 'cupcake', 'panqué'],
    'photo-1558961363-fa8fdf82db35'],
  // Dona
  [['dona', 'donut', 'doughnut'],
    'photo-1551024601-bec78de5b69f'],
  // Pan de elote
  [['pan de elote', 'elote', 'maíz', 'maiz', 'corn', 'tradicional mexicano'],
    'photo-1565299624946-b28f40a0ae38'],
  // Pan de nuez
  [['pan de nuez', 'nuez', 'nueces', 'walnut'],
    'photo-1509440159596-0249088772ff'],
  // Pan dulce / concha
  [['pan dulce', 'concha', 'cuerno'],
    'photo-1547592166-23ac45744acd'],
  // Bagel
  [['bagel'],
    'photo-1509440159596-0249088772ff'],
  // Pay / tarta
  [['pay', 'pie', 'tarta'],
    'photo-1519915028121-7d3463d20b13'],
  // Pastel / brownie
  [['pastel', 'cake', 'brownie', 'fondant'],
    'photo-1563729784474-d77dbb933a9e'],
  // Genérico pan (al final)
  [['pan', 'baguette', 'barra'],
    'photo-1509440159596-0249088772ff'],
  // Club sándwich (ANTES del genérico sándwich)
  [['club sándwich', 'club sandwich', 'triple piso', 'triple'],
    'photo-1481070414801-51fd732d7184'],
  // Caprese (ANTES del genérico sándwich)
  [['caprese', 'mozzarella', 'jitomate', 'albahaca', 'ciabatta'],
    'photo-1604328698692-f76ea9498e76'],
  // Pollo BBQ
  [['pollo bbq', 'bbq', 'plancha', 'pollo'],
    'photo-1598515214211-89d3c73ae83b'],
  // Jamón / ham
  [['jamón', 'jamon', 'ham'],
    'photo-1528735602780-2552fd46c7af'],
  // Genérico sándwich / torta
  [['sándwich', 'sandwich', 'torta'],
    'photo-1539252554453-80ab65ce3586'],
  [['wrap', 'burrito', 'taco'],
    'photo-1600585154340-be6161a56a0c'],
  // Ensalada
  [['ensalada', 'salad'],
    'photo-1512621776951-a57141f2eefd'],
]

const CATEGORY_FALLBACK = {
  'cafe':     'photo-1495474472287-4d71bcdd2085',
  'café':     'photo-1495474472287-4d71bcdd2085',
  'bebida':   'photo-1544145945-f90425340c7e',
  'pan':      'photo-1509440159596-0249088772ff',
  'sandwich': 'photo-1539252554453-80ab65ce3586',
  'sándwich': 'photo-1539252554453-80ab65ce3586',
  'te':       'photo-1556679343-c7306c1976bc',
  'té':       'photo-1556679343-c7306c1976bc',
  'otro':     'photo-1495474472287-4d71bcdd2085',
}

const DEFAULT_PHOTO = 'photo-1495474472287-4d71bcdd2085'

/**
 * Devuelve una URL de Unsplash para el producto dado.
 * Prioridad: exact match por nombre > keyword match > fallback por categoría.
 */
export function getProductImage(nombre = '', categoria = '', width = 400) {
  const key = norm(nombre)
  const photoId = EXACT_MATCH[key] ?? keywordMatch(nombre, categoria)
  return `https://images.unsplash.com/${photoId}?w=${width}&q=80&fit=crop&crop=center`
}

function keywordMatch(nombre, categoria) {
  const haystack = nombre.toLowerCase() + ' ' + categoria.toLowerCase()
  for (const [keywords, photoId] of KEYWORD_MAP) {
    if (keywords.some(kw => haystack.includes(kw))) return photoId
  }
  const catKey = norm(categoria)
  return CATEGORY_FALLBACK[catKey] ?? DEFAULT_PHOTO
}

export function getImagePlaceholder(categoria = '') {
  const COLORS = {
    'café':     '#2d6a4f',
    'cafe':     '#2d6a4f',
    'bebida':   '#1e6091',
    'pan':      '#8b5e3c',
    'sándwich': '#5a3a2a',
    'sandwich': '#5a3a2a',
    'te':       '#2d6a4f',
    'otro':     '#4a5568',
  }
  return COLORS[categoria.toLowerCase()] || '#2d6a4f'
}
