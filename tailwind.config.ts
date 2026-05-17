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
        // Deep oil-black surfaces
        bg:      '#0D0C09',
        bg1:     '#141210',
        bg2:     '#1C1916',
        surface: '#141210',
        card:    '#1C1916',

        // Warm hairline rules
        border:  '#2E2920',
        divider: '#2E2920',

        // Newsprint text scale
        text:  '#F0E9D6',
        text2: '#C8BC9A',
        text3: '#8C7D68',
        text4: '#5A4F42',

        // Instrument state — earthy, not neon
        ok:      '#5C8C4A',  // military olive
        caution: '#C17F24',  // aircraft amber
        warn:    '#C8601A',  // warning orange
        danger:  '#B83420',  // rust red
        info:    '#8C7D68',  // downgraded to warm grey

        // Brand accent — amber (replaces cyan)
        accent:     '#C17F24',
        'accent-hi':'#D4941A',

        // Named editorial tones
        amber:   '#C17F24',
        copper:  '#9A5A40',
        sand:    '#C8BC9A',
        military:'#485A38',

        // Legacy aliases kept for backward compat
        cyan:    '#C17F24',
        emerald: '#5C8C4A',
        red:     '#B83420',
      },
      fontFamily: {
        headline: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        mono:     ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        sans:     ['Inter', 'system-ui', 'sans-serif'],
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
