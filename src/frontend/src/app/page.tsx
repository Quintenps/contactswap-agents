'use client';

import Image from 'next/image';
import { AdminLink } from './_components/admin-link';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/lib/language-switcher';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="material-shell flex items-center justify-center relative overflow-hidden">
      {/* Background photo — drop any image at public/bg.png to change it */}
      <Image
        src="/bg.png"
        alt=""
        fill
        className="object-cover"
        priority
        aria-hidden="true"
      />
      {/* Dark overlay so text stays readable over any photo */}
      <div className="home-overlay" />
      {/* Ambient orbs on top of the overlay */}
      <div className="home-orb home-orb-1" />
      <div className="home-orb home-orb-2" />

      <div className="recipient-language-anchor">
        <LanguageSwitcher />
      </div>

      <div className="home-card flex flex-col items-start text-left px-10 py-14 max-w-md w-full relative z-10">
        {/* Swap icon */}
        <div className="home-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 8h13M16 8l-3-3M16 8l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 16H8M8 16l3-3M8 16l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="home-title mt-5">ContactSwap</h1>
        <p className="home-subtitle mt-3">{t('home.subtitle')}</p>
        <p className="home-description mt-4 text-sm leading-6">
          {t('home.description')}
        </p>
        <AdminLink />
      </div>
    </main>
  );
}

