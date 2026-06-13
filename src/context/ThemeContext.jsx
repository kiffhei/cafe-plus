import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('cafe_theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [tema, setTema] = useState(() =>
    localStorage.getItem('cafe_tema') || 'matcha'
  )

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('cafe_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('cafe_theme', 'light')
    }
  }, [dark])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('cafe_tema', tema)
  }, [tema])

  return (
    <ThemeContext.Provider value={{
      darkMode: dark,
      toggleDark: () => setDark(d => !d),
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
