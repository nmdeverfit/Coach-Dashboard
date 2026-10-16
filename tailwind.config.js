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
          input: '#dbdce3', // search bar and dropdowns on the client list
        },
        brand: '#184eff', // Icon/Brand
        'brand-subtle': '#e3ecff', // today's date chip (Training session log, Meal Log)
        orange: '#ff6b16', // Icon/Orange
        warning: '#f59e0b', // Icon/Warning
        danger: '#f04438',
        checked: '#0071fd', // completed to-do check
        dark: '#7b7e91', // "Dark" style
        elevated: '#fcfcfc', // Background/Elevated
        'ai-line': '#fc6969', // AI Assessment card stroke, the same on every to-do type
        status: {
          'risk-bg': '#fbdfdf',
          'risk-fg': '#7b2339',
          'risk-line': '#fc6969',
          'risk-dot': '#f03358',
          'attention-bg': '#ffe9d9',
          'attention-fg': '#8a3b0b',
          'attention-line': '#ffa36b',
          'attention-dot': '#f59e0b',
          'track-bg': '#dcf5e7',
          'track-fg': '#1d6b40',
          'track-line': '#6fd39a',
          'track-dot': '#059669',
          'none-bg': '#eceef2',
          'none-fg': '#6b7280',
        },
        meal: {
          1: '#4671ff',
          2: '#184eff',
          3: '#133ecc',
          4: '#0e2f99',
          empty: '#dfe0e5',
        },
        macro: {
          carb: '#44c473',
          fat: '#ffcc49',
          protein: '#4886fd',
        },
        sidebar: {
          1: '#d9e9ff',
          2: '#ffe6d9',
          3: '#ffd9d9',
        },
      },
      keyframes: {
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'drawer-out': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(100%)' } },
        // The middle column slides out from behind the panel and back under it.
        'side-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'side-out': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(100%)' } },
        // Olly's working state (screen recording): a light band sweeps across the status text, three dots pulse in turn.
        shimmer: { from: { backgroundPosition: '100% 0' }, to: { backgroundPosition: '-100% 0' } },
        'dot-wave': { '0%, 80%, 100%': { opacity: '0.35', transform: 'scale(0.8)' }, '40%': { opacity: '1', transform: 'scale(1)' } },
        'bubble-in': { from: { transform: 'translateY(6px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'drawer-in': 'drawer-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        'drawer-out': 'drawer-out 220ms ease-in forwards',
        'side-in': 'side-in 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        'side-out': 'side-out 220ms ease-in forwards',
        shimmer: 'shimmer 1.6s linear infinite',
        'dot-wave': 'dot-wave 1.2s ease-in-out infinite',
        'bubble-in': 'bubble-in 220ms ease-out both',
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
        row: '0 20px 14px 0 rgba(0,0,0,0), 0 10px 13px 0 rgba(0,0,0,0.04)',
        drawer: '0 0 40px rgba(0,0,0,0.1), -6px 0 5px rgba(0,0,0,0.05)',
        footer: '0 42px 125px rgba(0,0,0,0.05), 0 5.259px 18.156px rgba(0,0,0,0.09)',
        card: '0 1px 3px 0 rgba(24,78,255,0.07)',
        'ai-card': 'inset 0 0 20px 0 rgba(222,172,231,0.3)',
        'ai-button': 'inset 0 0 8px 0 rgba(222,172,231,0.3)',
        'ai-draft': 'inset 0 0 10px 0 rgba(222,172,231,0.5)',
        tooltip: '0 4px 24px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
