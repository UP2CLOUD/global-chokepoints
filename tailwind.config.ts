import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: '#07090F',
        bg1: '#0B0F18',
        bg2: '#131826',
        surface: '#0B0F18',
        card: '#131826',
        border: '#1E2533',
        divider: '#1E2533',

        // Text
        text: '#E6ECF3',
        text2: '#A9B4C2',
        text3: '#6B7787',
        text4: '#404B5A',

        // Semantic
        ok: '#10B981',
        caution: '#F59E0B',
        warn: '#F97316',
        danger: '#EF4444',
        info: '#38BDF8',

        // Brand accent
        cyan: '#06B6D4',
        accent: '#06B6D4',
        'accent-hi': '#67E8F9',

        // Legacy aliases — keep old class names working
        emerald: '#10B981',
        amber: '#F59E0B',
        red: '#EF4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 8 / 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64
        micro: ['0.5rem', { lineHeight: '0.75rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
      },
    },
  },
  plugins: [],
};
export default config;
