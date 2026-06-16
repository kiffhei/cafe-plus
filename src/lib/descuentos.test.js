import { describe, it, expect } from 'vitest'
import { regaloPorVisitas, calcularRegaloDescuento } from './descuentos'

// Helper para armar items de carrito de forma concisa.
const item = (precio, categoria, cantidad = 1) => ({
  producto: { precio_venta: precio, categoria },
  cantidad,
})

describe('regaloPorVisitas', () => {
  it('devuelve el regalo correcto en cada hito (4/9/14)', () => {
    expect(regaloPorVisitas(4)).toMatchObject({ categoria: 'cafe', cantidad: 1 })
    expect(regaloPorVisitas(9)).toMatchObject({ categoria: 'pan', cantidad: 1 })
    expect(regaloPorVisitas(14)).toMatchObject({ categoria: 'cafe', cantidad: 2 })
  })

  it('devuelve null fuera de los hitos', () => {
    expect(regaloPorVisitas(0)).toBeNull()
    expect(regaloPorVisitas(3)).toBeNull()
    expect(regaloPorVisitas(5)).toBeNull()
    expect(regaloPorVisitas(10)).toBeNull()
  })
})

describe('calcularRegaloDescuento', () => {
  it('sin regalo devuelve 0', () => {
    expect(calcularRegaloDescuento([item(40, 'café')], null)).toBe(0)
  })

  it('café x1: descuenta el café más barato del carrito', () => {
    const carrito = [item(55, 'café'), item(40, 'café'), item(30, 'pan')]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(4))).toBe(40)
  })

  it('café x2: descuenta las DOS unidades de café más baratas', () => {
    // café A $40 x1, café B $55 x2 -> unidades [40,55,55] -> 2 más baratas = 95
    const carrito = [item(40, 'café'), item(55, 'Café', 2)]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(14))).toBe(95)
  })

  it('café x2 pero solo hay 1 café: se topa a las unidades disponibles', () => {
    const carrito = [item(40, 'café'), item(99, 'pan')]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(14))).toBe(40)
  })

  it('no aplica si no hay ítem de la categoría del regalo', () => {
    const carrito = [item(30, 'pan'), item(25, 'bebida')]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(4))).toBe(0) // pide café, no hay
  })

  it('muffin (categoría pan): descuenta el pan más barato; normaliza acentos/mayúsculas', () => {
    const carrito = [item(35, 'Pan'), item(20, 'PAN'), item(50, 'café')]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(9))).toBe(20)
  })

  it('precio_venta como string se parsea correctamente', () => {
    const carrito = [item('45', 'café')]
    expect(calcularRegaloDescuento(carrito, regaloPorVisitas(4))).toBe(45)
  })
})
