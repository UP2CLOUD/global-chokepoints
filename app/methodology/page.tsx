import type { Metadata } from 'next';
import MethodologyContent from './MethodologyContent';

export const metadata: Metadata = {
  title: 'Methodology — IsStraitHormuzOpen?',
  description:
    'How IsStraitHormuzOpen? computes the Strait of Hormuz state: data sources, threat-score formula, refresh cadence, public API, and change log.',
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
