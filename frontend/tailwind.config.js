/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', '"Fira Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        apple: {
          blue: '#007AFF',
          'blue-hover': '#0062CC',
          'blue-light': '#E8F2FF',
          green: '#34C759',
          'green-light': '#E8F8ED',
          orange: '#FF9500',
          'orange-light': '#FFF3E0',
          red: '#FF3B30',
          'red-light': '#FFECEB',
          gray: {
            50: '#FAFAFA',
            100: '#F5F5F7',
            200: '#E8E8ED',
            300: '#D2D2D7',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#363639',
            900: '#1D1D1F',
          },
        },
      },
      borderRadius: {
        'apple': '0.75rem',
        'apple-lg': '1rem',
        'apple-xl': '1.25rem',
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
        'apple': '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
        'apple-md': '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)',
        'apple-lg': '0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.1)',
        'apple-button': '0 1px 2px rgba(0,0,0,0.06)',
        'apple-inner': 'inset 0 1px 2px rgba(0,0,0,0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'apple-spring': 'cubic-bezier(0.35, 0.8, 0.4, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.35, 0.8, 0.4, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.35, 0.8, 0.4, 1) forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
