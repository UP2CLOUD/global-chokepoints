'use client';

import { useLang } from './LangContext';
import Link from 'next/link';
import { SubscribeBellButton } from './SubscribeModal';
import SupportButton from './SupportButton';

export default function Footer() {
  const { t } = useLang();

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@ishormuzopen.example';

  return (
    <footer className="border-t border-divider mt-2 pt-8 pb-12 text-[11px] font-mono text-text3">
      {/* Top row — links and actions */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center justify-between mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span suppressHydrationWarning>© {new Date().getFullYear()} IsStraitHormuzOpen?</span>
          <span className="text-text4">·</span>
          <Link href="/methodology" className="hover:text-accent transition-colors duration-180">
            {t.footer.methodology}
          </Link>
          <span className="text-text4">·</span>
          <a href="/feed.xml" className="hover:text-accent transition-colors duration-180">RSS</a>
          <span className="text-text4">·</span>
          <Link href="/docs" className="hover:text-accent transition-colors duration-180">{t.footer.apiDocs}</Link>
          <span className="text-text4">·</span>
          <SubscribeBellButton />
          <span className="text-text4">·</span>
          <SupportButton variant="footer" />
          <span className="text-text4">·</span>
          <a href={`mailto:${contactEmail}`} className="hover:text-accent transition-colors duration-180">
            {t.footer.contact}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span>{t.footer.apiStatus}: <span className="text-ok">{t.footer.operational}</span></span>
        </div>
      </div>

      {/* Support strip */}
      <div className="mb-6 p-4 rounded-lg border border-divider/50 bg-bg1/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-text3 text-[11px] leading-relaxed max-w-xl">
          {t.footer.support}
        </p>
        <SupportButton variant="inline" />
      </div>

      {/* Disclaimer */}
      <p className="text-text4 max-w-3xl leading-relaxed">
        {t.footer.disclaimer}
      </p>
    </footer>
  );
}
