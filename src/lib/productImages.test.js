import { describe, it, expect } from 'vitest'
import { getProductImage, getImagePlaceholder } from './productImages'

// Extrae el photoId del URL de Unsplash que devuelve getProductImage.
// https://images.unsplash.com/<photoId>?w=...  ->  <photoId>
const photoId = (url) => url.slice(url.lastIndexOf('/') + 1, url.indexOf('?'))

describe('getProductImage', () => {
  describe('formato del URL', () => {
    it('apunta a images.unsplash.com con los query params esperados', () => {
      const url = getProductImage('Croissant', 'pan')
      expect(url.startsWith('https://images.unsplash.com/')).toBe(true)
      expect(url).toContain('q=80&fit=crop&crop=center')
    })

    it('usa width 400 por defecto y respeta un width explícito', () => {
      expect(getProductImage('Croissant', 'pan')).toContain('w=400')
      expect(getProductImage('Croissant', 'pan', 800)).toContain('w=800')
    })
  })

  describe('EXACT_MATCH por nombre normalizado', () => {
    // Regresión INC-S8-C: Muffin Chocolate obtenía la imagen de Blueberry.
    it('distingue Muffin Chocolate de Muffin Blueberry', () => {
      const choco = photoId(getProductImage('Muffin Chocolate', 'pan'))
      const blue = photoId(getProductImage('Muffin Blueberry', 'pan'))
      expect(choco).toBe('photo-1571115177098-24ec42ed204d')
      expect(blue).toBe('photo-1607478900766-efe13248b125')
      expect(choco).not.toBe(blue)
    })

    it('tiene PRIORIDAD sobre el keyword map cuando ambos divergen', () => {
      // "Té Verde": exact -> c7306c1976bc | keyword "matcha/té verde" -> 770b48d82b0a
      const url = photoId(getProductImage('Té Verde', 'te'))
      expect(url).toBe('photo-1556679343-c7306c1976bc') // gana el exact match
      expect(url).not.toBe('photo-1536256263959-770b48d82b0a') // no el de keyword
    })
  })

  describe('normalización de nombre (norm via getProductImage)', () => {
    it('ignora mayúsculas y acentos al resolver el exact match', () => {
      const base = photoId(getProductImage('cafe americano', 'cafe'))
      expect(photoId(getProductImage('CAFÉ AMERICANO', 'cafe'))).toBe(base)
      expect(photoId(getProductImage('  Café Americano  ', 'cafe'))).toBe(base)
      expect(base).toBe('photo-1510591509098-f4fdc8e10c4d')
    })
  })

  describe('keyword fallback (sin exact match)', () => {
    it('usa keyword cuando el nombre no está en EXACT_MATCH', () => {
      // "Mocha Grande" no es exact; keyword "mocha"
      expect(photoId(getProductImage('Mocha Grande', 'cafe')))
        .toBe('photo-1578374173705-969cbe6f2d6b')
    })

    it('respeta el orden: blueberry específico antes que muffin genérico', () => {
      // "Muffin de Arándano" no es exact; keyword "arándano" gana al genérico "muffin"
      expect(photoId(getProductImage('Muffin de Arándano', 'pan')))
        .toBe('photo-1607478900766-efe13248b125')
    })
  })

  describe('fallback por categoría y default', () => {
    it('cae a la categoría cuando no hay match de nombre ni keyword', () => {
      expect(photoId(getProductImage('', 'bebida')))
        .toBe('photo-1544145945-f90425340c7e')
    })

    it('devuelve el photo por defecto cuando nada coincide', () => {
      expect(photoId(getProductImage('Zzz', 'Zzz')))
        .toBe('photo-1495474472287-4d71bcdd2085')
    })
  })
})

describe('getImagePlaceholder', () => {
  it('devuelve el color por categoría (case-insensitive)', () => {
    expect(getImagePlaceholder('Café')).toBe('#2d6a4f')
    expect(getImagePlaceholder('bebida')).toBe('#1e6091')
    expect(getImagePlaceholder('PAN')).toBe('#8b5e3c')
  })

  it('devuelve el verde por defecto para categoría desconocida', () => {
    expect(getImagePlaceholder('desconocida')).toBe('#2d6a4f')
    expect(getImagePlaceholder()).toBe('#2d6a4f')
  })
})
