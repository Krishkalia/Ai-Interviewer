/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-variant': '#2d3449',
        'on-background': '#dae2fd',
        'tertiary': '#ffb783',
        'surface-tint': '#c0c1ff',
        'surface-bright': '#31394d',
        'on-primary-container': '#0d0096',
        'tertiary-container': '#d97721',
        'on-secondary': '#292a60',
        'surface-container-highest': '#2d3449',
        'on-surface': '#dae2fd',
        'surface-container-low': '#131b2e',
        'surface-container-high': '#222a3d',
        'on-primary': '#1000a9',
        'error': '#ffb4ab',
        'surface-container': '#171f33',
        'background': '#0b1326',
        'surface': '#0b1326',
        'surface-container-lowest': '#060e20',
        'inverse-primary': '#494bd6',
        'primary-container': '#8083ff',
        'outline': '#908fa0',
        'secondary-container': '#42447b',
        'secondary': '#c0c1ff',
        'outline-variant': '#464554',
        'on-secondary-container': '#b2b3f2',
        'on-surface-variant': '#c7c4d7',
        'primary': '#c0c1ff',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      animation: {
        'speak-ring': 'speakRing 1.8s ease-out infinite',
        'speak-ring-2': 'speakRing 1.8s ease-out 0.6s infinite',
      },
      keyframes: {
        speakRing: {
          '0%': { opacity: '0.4', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(1.2)' },
        }
      }
    },
  },
  plugins: [],
}
