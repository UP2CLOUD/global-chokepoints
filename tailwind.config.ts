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
        // Deep tactical dark surfaces
        bg:      '#070B11',
        bg1:     '#0F1722',
        bg2:     '#131D2B',
        surface: '#0F1722',
        card:    '#131D2B',

        // Subtle hairline borders
        border:  '#1E2A3B',
        divider: '#1E2A3B',

        // Intelligence terminal text scale
        text:  '#E6EDF5',
        text2: '#9FB0C7',
        text3: '#6B7A90',
        text4: '#4A5568',

        // Operational status colors
        ok:      '#49D17D',  // ops green
        caution: '#FFB84D',  // warning amber
        warn:    '#FF9944',  // escalation orange
        danger:  '#FF5A5A',  // critical red
        info:    '#4DA3FF',  // operational blue

        // Brand accent — Operational Blue
        accent:      '#4DA3FF',
        'accent-hi': '#6AB5FF',

        // Semantic color aliases
        purple:  '#B07CFF',  // AIS interference
        amber:   '#FFB84D',
        sand:    '#9FB0C7',
        military:'#49D17D',

        // Legacy aliases kept for backward compat
        cyan:    '#4DA3FF',
        emerald: '#49D17D',
        red:     '#FF5A5A',
        copper:  '#9A5A40',
      },
      fontFamily: {
        headline: ['var(--font-inter)', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:     ['var(--font-jetbrains)', 'var(--font-ibm-plex)', 'monospace'],
        sans:     ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif:    ['Georgia', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        micro: ['0.5rem', { lineHeight: '0.75rem' }],
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
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
