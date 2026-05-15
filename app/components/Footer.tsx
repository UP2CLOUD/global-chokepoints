'use client';

import { useLang } from './LangContext';
import Link from 'next/link';
import { SubscribeBellButton } from './SubscribeModal';
import SupportButton from './SupportButton';

export default function Footer() {
  const { t, lang } = useLang();

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@ishormuzopen.example';

  return (
    <footer className="border-t border-divider mt-2 pt-8 pb-12 text-[11px] font-mono text-text3">
      {/* Top row — links and actions */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center justify-between mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span suppressHydrationWarning>© {new Date().getFullYear()} IsStraitHormuzOpen?</span>
          <span className="text-text4">·</span>
          <Link href="/methodology" className="hover:text-accent transition-colors duration-180">
            {lang === 'en' ? 'Methodology' : 'Metodologia'}
          </Link>
          <span className="text-text4">·</span>
          <a href="/feed.xml" className="hover:text-accent transition-colors duration-180">RSS</a>
          <span className="text-text4">·</span>
          <Link href="/docs" className="hover:text-accent transition-colors duration-180">API Docs</Link>
          <span className="text-text4">·</span>
          <SubscribeBellButton />
          <span className="text-text4">·</span>
          <SupportButton variant="footer" />
          <span className="text-text4">·</span>
          <a href={`mailto:${contactEmail}`} className="hover:text-accent transition-colors duration-180">
            {lang === 'en' ? 'Contact' : 'Contato'}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span>{t.footer.apiStatus}: <span className="text-ok">{t.footer.operational}</span></span>
        </div>
      </div>

      {/* Support strip */}
      <div className="mb-6 p-4 rounded-lg border border-divider/50 bg-bg1/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-text3 text-[11px] leading-relaxed max-w-xl">
          {lang === 'en'
            ? 'This independent monitor runs on public data feeds, edge infrastructure, and AIS integrations. Your support helps keep the monitoring free and online.'
            : 'Este monitor independente funciona com feeds de dados públicos, infraestrutura de edge e integrações AIS. Seu apoio ajuda a manter o monitoramento gratuito e online.'}
        </p>
        <SupportButton variant="inline" />
      </div>

      {/* Disclaimer */}
      <p className="text-text4 max-w-3xl leading-relaxed">
        {lang === 'en'
          ? 'For informational purposes only. Not navigational, financial or operational advice. Always verify with official authorities (IMO, NAVCENT, UKMTO, port authorities) before making decisions. This site does not claim affiliation with any government, military, or port authority.'
          : 'Apenas para fins informativos. Não constitui aconselhamento de navegação, financeiro ou operacional. Sempre verifique com autoridades oficiais (IMO, NAVCENT, UKMTO, autoridades portuárias) antes de tomar decisões. Este site não reivindica afiliação com nenhum governo, militar ou autoridade portuária.'}
      </p>
    </footer>
  );
}
