// Mapeo de keywords de nombre/categoría a IDs de Unsplash verificados.
// Cada entrada: [photoId, crédito] — el photoId va en la URL de Unsplash.

const KEYWORD_MAP = [
  // Espresso / café base
  [['espresso', 'shot', 'ristretto'],       'photo-1509042239860-f550ce710b93'],
  [['americano'],                            'photo-1485808191679-5f86510bd5b8'],
  [['latte', 'flat white'],                  'photo-1561882468-9110e03e0f78'],
  [['cappuccino', 'capuccino'],              'photo-1572442388796-11668a67e53d'],
  [['mocha', 'moka', 'mocca'],              'photo-1578374173705-969cbe6f2d6b'],
  [['macchiato'],                            'photo-1485808191679-5f86510bd5b8'],
  [['cold brew', 'cold-brew'],              'photo-1517959105821-ecd7a1a41ca5'],
  [['frappé', 'frappe', 'frapé'],           'photo-1461023058943-07fcbe16d735'],
  [['matcha'],                               'photo-1536256263959-770b48d82b0a'],
  [['té', 'te', 'tea', 'chai'],             'photo-1556679343-c7306c1976bc'],
  [['chocolate caliente', 'chocolate'],     'photo-1542990253-0d0f5be5f0ed'],
  // Bebidas frías / jugos
  [['limonada', 'lemonade'],                'photo-1568622503284-d6af7f2b3a66'],
  [['jugo', 'smoothie', 'licuado'],         'photo-1622597467836-f3285f2131b8'],
  [['agua', 'water', 'mineral'],            'photo-1559839914-17aae19cec71'],
  [['jamaica', 'hibisco'],                  'photo-1601055903647-ddf1ee9701b7'],
  // Panadería
  [['croissant'],                            'photo-1555507036-ab1f4038808a'],
  [['muffin', 'cupcake', 'panqué'],         'photo-1558961363-fa8fdf82db35'],
  [['dona', 'donut', 'doughnut'],           'photo-1551024601-bec78de5b69f'],
  [['bagel'],                                'photo-1509440159596-0249088772ff'],
  [['pan dulce', 'concha', 'cuerno'],       'photo-1547592166-23ac45744acd'],
  [['baguette', 'barra'],                    'photo-1549931319-a545dcf3bc73'],
  [['pay', 'pie', 'tarta'],                 'photo-1519915028121-7d3463d20b13'],
  [['pastel', 'cake', 'brownie', 'fondant'],'photo-1563729784474-d77dbb933a9e'],
  // Sándwiches / comida
  [['sándwich', 'sandwich', 'torta'],       'photo-1539252554453-80ab65ce3586'],
  [['wrap', 'burrito', 'taco'],             'photo-1600585154340-be6161a56a0c'],
  [['ensalada', 'salad'],                    'photo-1512621776951-a57141f2eefd'],
  [['panini', 'focaccia'],                  'photo-1567620905732-2d1ec7ab7445'],
  // Genérico café (categoría)
  [['café', 'cafe', 'coffee'],              'photo-1495474472287-4d71bcdd2085'],
]

const CATEGORY_FALLBACK = {
  'café':      'photo-1495474472287-4d71bcdd2085',
  'bebida':    'photo-1544145945-f90425340c7e',
  'pan':       'photo-1509440159596-0249088772ff',
  'sándwich':  'photo-1539252554453-80ab65ce3586',
  'sandwich':  'photo-1539252554453-80ab65ce3586',
  'otro':      'photo-1495474472287-4d71bcdd2085',
}

const DEFAULT_PHOTO = 'photo-1495474472287-4d71bcdd2085'

/**
 * Devuelve una URL de Unsplash basada en el nombre y categoría del producto.
 * @param {string} nombre
 * @param {string} categoria
 * @param {number} [width=400]
 * @returns {string}
 */
export function getProductImage(nombre = '', categoria = '', width = 400) {
  const haystack = nombre.toLowerCase() + ' ' + categoria.toLowerCase()

  for (const [keywords, photoId] of KEYWORD_MAP) {
    if (keywords.some(kw => haystack.includes(kw))) {
      return `https://images.unsplash.com/${photoId}?w=${width}&q=80&fit=crop&crop=center`
    }
  }

  const catKey = categoria.toLowerCase()
  const fallback = CATEGORY_FALLBACK[catKey] || DEFAULT_PHOTO
  return `https://images.unsplash.com/${fallback}?w=${width}&q=80&fit=crop&crop=center`
}

/**
 * Devuelve un placeholder blurred mientras carga la imagen real.
 */
export function getImagePlaceholder(categoria = '') {
  const COLORS = {
    'café':     '#2d6a4f',
    'bebida':   '#1e6091',
    'pan':      '#8b5e3c',
    'sándwich': '#5a3a2a',
    'otro':     '#4a5568',
  }
  return COLORS[categoria.toLowerCase()] || '#2d6a4f'
}
