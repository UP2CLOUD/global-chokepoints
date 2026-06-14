import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed Configurator — Global Chokepoints Alerts',
  description: 'Configure and embed a live Global Chokepoints Alerts maritime status widget on your website. Free under CC-BY-4.0.',
};

export default function EmbedConfigureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
