'use client';

import { useLang } from './LangContext';
import Link from 'next/link';
import { SubscribeBellButton } from './SubscribeModal';

export default function Footer() {
  const { t, lang } = useLang();

  return (
    <footer className="border-t border-divider mt-2 pt-6 pb-10 text-[11px] font-mono text-text3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>© {new Date().getFullYear()} IsStraitHormuzOpen?</span>
          <span className="text-text4">·</span>
          <Link href="/methodology" className="hover:text-accent transition-colors duration-180">
            {lang === 'en' ? 'Methodology' : 'Metodologia'}
          </Link>
          <span className="text-text4">·</span>
          <a href="/feed.xml" className="hover:text-accent transition-colors duration-180">RSS</a>
          <span className="text-text4">·</span>
          <a href="/v1/status" className="hover:text-accent transition-colors duration-180">API</a>
          <span className="text-text4">·</span>
          <SubscribeBellButton />
        </div>
        <div className="flex items-center gap-3">
          <span>{t.footer.apiStatus}: <span className="text-ok">{t.footer.operational}</span></span>
        </div>
      </div>
      <p className="mt-4 text-text4 max-w-3xl leading-relaxed">
        {lang === 'en'
          ? 'For informational purposes only. Not navigational, financial or operational advice. Always verify with official authorities (IMO, NAVCENT, UKMTO, port authorities) before making decisions.'
          : 'Apenas para fins informativos. Não constitui aconselhamento de navegação, financeiro ou operacional. Sempre verifique com autoridades oficiais (IMO, NAVCENT, UKMTO, autoridades portuárias) antes de tomar decisões.'}
      </p>
    </footer>
  );
}
