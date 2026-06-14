import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get an API Key — Global Chokepoints Alerts',
  description: 'Issue a free API key for the Global Chokepoints Alerts public data API. Rate-limited access to real-time maritime intelligence endpoints.',
};

export default function KeysLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
