/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cafe: {
          50:  '#f0faf4',
          100: '#dcf2e6',
          200: '#b8e4cc',
          300: '#84cba8',
          400: '#52b788',
          500: '#2d6a4f',
          600: '#245c43',
          700: '#1a4a34',
          800: '#0d2d1f',
          900: '#071a12',
        },
        crema: {
          50:  '#f8fffe',
          100: '#f0faf8',
          200: '#c8e6c9',
          300: '#a5d6b0',
          400: '#81c99a',
          500: '#52b788',
        },
        terracota: {
          400: '#48cae4',
          500: '#1e6091',
          600: '#184f7a',
          700: '#103d5e',
        },
        olivo: {
          400: '#74c69d',
          500: '#40916c',
          600: '#2d6a4f',
        },
        'cafe-accent':    'var(--cafe-accent)',
        'cafe-btn':       'var(--cafe-btn)',
        'cafe-border':    'var(--cafe-border)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body:    ['"Outfit"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'warm':    '0 4px 24px rgba(0, 0, 0, 0.12)',
        'warm-lg': '0 8px 40px rgba(0, 0, 0, 0.22)',
        'card':    '0 2px 12px rgba(0, 0, 0, 0.08)',
        'glow':    '0 0 0 3px rgba(0, 0, 0, 0.12)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animationDelay: {
        '75':  '75ms',
        '150': '150ms',
        '225': '225ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
