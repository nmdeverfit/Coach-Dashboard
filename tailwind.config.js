/** Tokens mirror the Figma variables of the AI Coach Dashboard file. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#202353', // Text/Primary
          secondary: '#838d9f', // Text/Secondary
          tertiary: '#6b7280', // Text/Tertiary
          muted: '#9ca3af', // Text/Muted
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f4f6fb', // Background/Secondary
        },
        line: {
          DEFAULT: '#e9e9ee', // Border/Default
          light: '#dfe0e5', // Border/Light
          button: '#d4d7d9',
          chip: '#d4d4d4',
          nav: '#e1e1ea',
        },
        brand: '#184eff', // Icon/Brand
        orange: '#ff6b16', // Icon/Orange
        warning: '#f59e0b', // Icon/Warning
        danger: '#f04438',
        sidebar: {
          1: '#d9e9ff',
          2: '#ffe6d9',
          3: '#ffd9d9',
        },
      },
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', '"Open Sans"', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      boxShadow: {
        'shadow-1': '0 1px 2px 0 rgba(102,102,102,0.08), 0 1px 1px 0 rgba(102,102,102,0.08)',
        column: '8px 0 30px 0 rgba(0,0,0,0.05)',
        'see-all': '0 -2px 15px rgba(0,0,0,0.08)',
        dialog: '0 12px 40px rgba(32,35,83,0.18)',
      },
    },
  },
  plugins: [],
};
