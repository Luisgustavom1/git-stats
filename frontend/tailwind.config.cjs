/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          dim: 'hsl(var(--surface-dim))',
          low: 'hsl(var(--surface-container-low))',
          high: 'hsl(var(--surface-container-high))',
          highest: 'hsl(var(--surface-container-highest))',
          variant: 'hsl(var(--surface-variant))',
          bright: 'hsl(var(--surface-bright))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        ring: 'hsl(var(--ring))'
      },
      borderRadius: {
        xl: '0.75rem',
        full: '9999px'
      },
      boxShadow: {
        ambient: '0 10px 40px rgba(0, 0, 0, 0.4)'
      }
    }
  },
  plugins: []
}
