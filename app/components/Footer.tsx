'use client';

import { useLang } from './LangContext';
import Link from 'next/link';
import { SubscribeBellButton } from './SubscribeModal';
import SupportButton from './SupportButton';

export default function Footer() {
  const { t } = useLang();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@ishormuzopen.example';

  return (
    <footer className="border-t border-divider pt-8 pb-12 mt-0">

      {/* Top row — links */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-[10px] font-mono text-text3">
        <span suppressHydrationWarning className="text-text4">
          © {new Date().getFullYear()} IsStraitHormuzOpen?
        </span>
        <span className="text-text4" aria-hidden>·</span>
        <Link href="/methodology" className="hover:text-text2 transition-colors">
          {t.footer.methodology}
        </Link>
        <span className="text-text4" aria-hidden>·</span>
        <a href="/feed.xml" className="hover:text-text2 transition-colors">RSS</a>
        <span className="text-text4" aria-hidden>·</span>
        <Link href="/docs" className="hover:text-text2 transition-colors">{t.footer.apiDocs}</Link>
        <span className="text-text4" aria-hidden>·</span>
        <SubscribeBellButton />
        <span className="text-text4" aria-hidden>·</span>
        <SupportButton variant="footer" />
        <span className="text-text4" aria-hidden>·</span>
        <a href={`mailto:${contactEmail}`} className="hover:text-text2 transition-colors">
          {t.footer.contact}
        </a>
        <span className="ml-auto text-text4">
          {t.footer.apiStatus}: <span className="text-ok">{t.footer.operational}</span>
        </span>
      </div>

      {/* Support strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 border-t border-b border-divider mb-5">
        <p className="text-[11px] font-mono text-text3 leading-relaxed max-w-xl">
          {t.footer.support}
        </p>
        <SupportButton variant="inline" />
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] font-mono text-text4 leading-relaxed max-w-3xl">
        {t.footer.disclaimer}
      </p>
    </footer>
  );
}
