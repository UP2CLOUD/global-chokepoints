# IsHormuzOpen

Real-time dashboard monitoring the Strait of Hormuz status, maritime traffic, oil prices (Brent), and geopolitical intelligence.

## Features

- **Global Status Indicator**: Immediate OPEN / PARTIALLY CLOSED / CLOSED status
- **Tension Gauge**: Normal / Elevated / Critical levels with animated bar
- **Brent Oil Chart**: 7-day price history via Recharts
- **Maritime Traffic Map**: Animated Canvas simulation (ready for AIS integration)
- **Real-Time News**: GDELT API integration (free, no key required)
- **Event Timeline**: Filterable by category (Incident, Military, Diplomatic, Economic)
- **Bilingual**: English (default) / Portuguese with instant switch
- **Mobile-First**: Fully responsive, stacks perfectly on small screens

## Stack

- **Framework**: Next.js 14 (App Router, Static Export)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS (custom design system)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Fonts**: JetBrains Mono + Inter

## Real APIs Integrated

| Source | Endpoint | Data | Cost |
|--------|----------|------|------|
| **Commodities-API** | `commodities-api.com/api/latest` | Brent crude price | **Free** (100 req/month) |
| **GDELT Project** | `api.gdeltproject.org/api/v2/doc/doc` | Geopolitical news/events | **Free** (no key) |
| **MarineTraffic** | AIS Web API (placeholder) | Vessel positions | Freemium |

## Project Structure

```
app/
  components/
    Header.tsx              # Sticky header + Language Switcher
    HeroStatus.tsx          # Giant status indicator + tension gauge
    MetricsGrid.tsx         # 4 metric cards (Brent, vessels, incident, variation)
    MetricCard.tsx          # Reusable metric card
    BrentChart.tsx          # Area chart with tooltip
    VesselMap.tsx           # Animated Canvas map
    NewsFeed.tsx            # Scrollable news list with sentiment
    Timeline.tsx            # Filterable vertical timeline
    Footer.tsx              # API status + latency
    RefreshButton.tsx       # Floating action button
    LoadingScreen.tsx       # Initial loading overlay
    LangContext.tsx         # React Context for i18n
    LanguageSwitcher.tsx    # EN/PT toggle button
  lib/
    types.ts                # TypeScript interfaces
    translations.ts         # EN + PT translation dictionaries
    mockData.ts             # Bilingual mock data + helpers
    utils.ts                # Formatting utilities
    api.ts                  # Real API fetchers with fallback
  globals.css               # Tailwind + custom keyframes
  layout.tsx                # Root layout (metadata, viewport)
  page.tsx                  # Main dashboard composition
```

## Environment Variables

```bash
# Optional — only needed for premium features
NEXT_PUBLIC_NEWS_API_KEY=your_key        # NewsAPI (alternative to GDELT)
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_key   # Alpha Vantage (alternative Brent)
NEXT_PUBLIC_MARINE_TRAFFIC_KEY=your_key  # Real AIS vessel tracking
```

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Static build (for CDN deploy)
npm run build
# Output: out/
```

## Deploy

Works on any static host:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag `out/` folder
- **Cloudflare Pages**: Connect repo
- **GitHub Pages**: Use GitHub Actions

## License

MIT — For informational purposes only. Data accuracy depends on third-party APIs.
# strait-of-hormuz-monitor
