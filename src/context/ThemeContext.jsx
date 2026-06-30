import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const LIGHT_THEMES = new Set(['vinyl-light'])

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() =>
    localStorage.getItem('cafe_tema') || 'matcha'
  )

  const darkMode = !LIGHT_THEMES.has(tema)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', tema)
    localStorage.setItem('cafe_tema', tema)
    if (LIGHT_THEMES.has(tema)) {
      root.classList.remove('dark')
      localStorage.setItem('cafe_theme', 'light')
    } else {
      root.classList.add('dark')
      localStorage.setItem('cafe_theme', 'dark')
    }
  }, [tema])

  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleDark: () => {},
      tema,
      setTema,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
