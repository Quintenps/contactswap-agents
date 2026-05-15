import type { Metadata } from 'next';
import { Nunito_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'ContactSwap',
  description: 'Keep your contacts fresh.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${nunitoSans.variable} ${spaceGrotesk.variable}`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}

