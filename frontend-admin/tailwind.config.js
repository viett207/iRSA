/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        irsa: {
          canvas: '#F3F0E6',
          card: '#FFFFFF',
          charcoal: '#18181B',
          muted: '#71717A',
          border: '#E4DFD3',
          'success-bg': '#DCFCE7',
          'success-text': '#166534',
          'success-dot': '#22C55E',
          'warning-bg': '#FEF3C7',
          'warning-text': '#92400E',
          'warning-dot': '#F59E0B',
          'neutral-bg': '#F4F4F5',
          'neutral-text': '#3F3F46',
          'neutral-dot': '#A1A1AA',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
