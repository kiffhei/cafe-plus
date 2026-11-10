import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function Sonda() {
  const { tema, darkMode, setTema } = useTheme()
  return (
    <div>
      <div data-testid="tema">{tema}</div>
      <div data-testid="darkMode">{String(darkMode)}</div>
      <button onClick={() => setTema('vinyl-light')}>vinyl-light</button>
      <button onClick={() => setTema('medianoche')}>medianoche</button>
    </div>
  )
}

function renderConProvider() {
  return render(
    <ThemeProvider>
      <Sonda />
    </ThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.classList.remove('dark')
})

describe('ThemeContext', () => {
  it('usa "matcha" como tema por defecto cuando no hay nada en localStorage', () => {
    renderConProvider()
    expect(screen.getByTestId('tema')).toHaveTextContent('matcha')
    expect(screen.getByTestId('darkMode')).toHaveTextContent('true')
  })

  it('lee el tema guardado previamente en localStorage al montar', () => {
    localStorage.setItem('cafe_tema', 'terracota')
    renderConProvider()
    expect(screen.getByTestId('tema')).toHaveTextContent('terracota')
  })

  it('aplica data-theme y la clase dark en <html> para un tema oscuro', () => {
    renderConProvider()
    expect(document.documentElement.getAttribute('data-theme')).toBe('matcha')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('cafe_theme')).toBe('dark')
  })

  it('vinyl-light es el único tema claro: darkMode queda en false y quita la clase dark', () => {
    renderConProvider()
    fireEvent.click(screen.getByText('vinyl-light'))
    expect(screen.getByTestId('darkMode')).toHaveTextContent('false')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('cafe_theme')).toBe('light')
    expect(localStorage.getItem('cafe_tema')).toBe('vinyl-light')
  })

  it('cambiar a otro tema oscuro distinto mantiene darkMode en true', () => {
    renderConProvider()
    fireEvent.click(screen.getByText('medianoche'))
    expect(screen.getByTestId('tema')).toHaveTextContent('medianoche')
    expect(screen.getByTestId('darkMode')).toHaveTextContent('true')
  })

  it('useTheme fuera de ThemeProvider lanza un error', () => {
    function SondaSinProvider() {
      useTheme()
      return null
    }
    expect(() => render(<SondaSinProvider />)).toThrow('useTheme must be used within ThemeProvider')
  })
})
