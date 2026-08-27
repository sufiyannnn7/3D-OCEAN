/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#030814',
          900: '#071226',
          850: '#0c1b36',
          800: '#11254a',
          700: '#18386e',
          600: '#1f4f9c',
          500: '#256ec7',
          400: '#3894f2',
          300: '#70b5ff',
          200: '#a8d3ff',
          100: '#ddedff',
          50: '#f0f7ff',
        },
        cyan: {
          DEFAULT: '#00f2fe',
          glow: '#00f2fe88',
        },
        teal: {
          accent: '#4facfe',
        },
        scientific: {
          panel: 'rgba(7, 18, 38, 0.75)',
          border: 'rgba(70, 150, 240, 0.22)',
          highlight: 'rgba(56, 148, 242, 0.15)',
          text: '#e2edfd',
          dim: '#8ba4cb',
          dark: '#030814',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow': '0 0 20px rgba(56, 148, 242, 0.2), 0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'cyan-glow': '0 0 15px rgba(0, 242, 254, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
