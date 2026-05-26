import type { Metadata } from 'next';
import MethodologyContent from './MethodologyContent';

export const metadata: Metadata = {
  title: 'Methodology — Global Chokepoints Alerts',
  description:
    'How Global Chokepoints Alerts monitors maritime chokepoints: data sources, threat-score formula, refresh cadence, public API, and change log.',
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
