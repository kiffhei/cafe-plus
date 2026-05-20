/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cafe: {
          50:  '#fdf8f3',
          100: '#f5e6d3',
          200: '#e8c9a0',
          300: '#d4a96a',
          400: '#c08040',
          500: '#8B4513',
          600: '#7a3d11',
          700: '#5c2d0d',
          800: '#3d1e08',
          900: '#1f0f04',
        },
        crema: {
          50:  '#fffdf9',
          100: '#fef9f0',
          200: '#fdf0dc',
          300: '#fae4c0',
          400: '#f5d49a',
          500: '#F5DEB3',
        },
        terracota: {
          400: '#e07850',
          500: '#C1440E',
          600: '#a83a0c',
          700: '#8a2f0a',
        },
        olivo: {
          400: '#8a9a5b',
          500: '#6B7C3D',
          600: '#5a6832',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'warm':    '0 4px 24px rgba(139, 69, 19, 0.12)',
        'warm-lg': '0 8px 40px rgba(139, 69, 19, 0.18)',
        'card':    '0 2px 12px rgba(139, 69, 19, 0.08)',
      },
    },
  },
  plugins: [],
}
