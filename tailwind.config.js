/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cool indigo accent against quiet slate surfaces.
        brand: {
          50: '#f1f0ff',
          100: '#e4e2ff',
          200: '#cbc7ff',
          300: '#aaa3ff',
          400: '#9188f7',
          500: '#776de8',
          600: '#6256cb',
          700: '#4e43a9',
          800: '#393278',
          900: '#29264d',
        },
        accent: '#b3a8ff',
        surface: {
          DEFAULT: '#0c1019',
          soft: '#111723',
          raised: '#192131',
        },
        ink: {
          DEFAULT: '#f3f5fa',
          muted: '#b0bbcd',
          faint: '#8794a9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.16), 0 12px 32px -18px rgba(0,0,0,0.55)',
        glow: '0 0 0 1px rgba(170,163,255,0.2), 0 12px 40px -18px rgba(119,109,232,0.3)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        float: 'float 6s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 6s ease infinite',
      },
    },
  },
  plugins: [],
};
