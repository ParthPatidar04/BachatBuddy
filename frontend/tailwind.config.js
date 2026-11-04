const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        // theme tokens: values live in index.css and swap with the .dark class
        bg: token('bg'),
        surface: token('surface'),
        surface2: token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        primary: token('primary'),
        primarySoft: token('primary-soft'),
        // reserved status colors (always paired with an icon + label)
        good: '#0ca30c',
        warn: '#fab219',
        serious: '#ec835a',
        bad: '#d03b3b',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 8px 24px -12px rgb(var(--shadow) / 0.12)',
        pop: '0 20px 50px -12px rgb(var(--shadow) / 0.35)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { opacity: 0, transform: 'scale(.96) translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(16px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease-out both',
        pop: 'pop .2s ease-out both',
        float: 'float 6s ease-in-out infinite',
        slideIn: 'slideIn .25s ease-out both',
      },
    },
  },
  plugins: [],
};