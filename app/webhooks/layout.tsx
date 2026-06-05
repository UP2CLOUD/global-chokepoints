import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Webhooks — Global Chokepoints Alerts',
  description: 'Register HTTPS webhooks to receive HMAC-signed notifications when chokepoint status changes.',
};

export default function WebhooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
