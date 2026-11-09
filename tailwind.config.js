/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.vue",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ninja: {
          dark: '#080a11',
          card: '#0f1422',
          cardHover: '#161c2e',
          border: 'rgba(255, 255, 255, 0.08)',
          orange: '#ff5500',
          cyan: '#00d2ff',
          gold: '#ffd700',
          sharingan: '#ff2a4b',
        },
        grade: {
          UR: '#ec4899',
          SSS: '#f97316',
          SS: '#eab308',
          S: '#ef4444',
          A: '#8b5cf6',
          B: '#3b82f6',
          C: '#10b981',
          D: '#64748b'
        }
      },
      fontFamily: {
        ninja: ['Montserrat', 'Inter', 'sans-serif'],
        title: ['"Cinzel Decorative"', '"Cinzel"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 25px rgba(255, 85, 0, 0.45)',
        'glow-cyan': '0 0 25px rgba(0, 210, 255, 0.45)',
        'glow-gold': '0 0 30px rgba(255, 215, 0, 0.45)',
        'glow-ur': '0 0 30px rgba(236, 72, 153, 0.55)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}


