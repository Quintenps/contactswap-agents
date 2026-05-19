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
  icons: {
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD50lEQVR4nO2Y2WsUQRCHFw9QjPrmH+CDN/jmfT2IeCBeqNGoURM1UaO5kzXxvhKNR4waDYg+BAVB9CEioiAKKor6L31SpALj0F0z0xsRYQqa3Z3Z6vl+3dXV1VMo5JZbbrnl9rcNGCOt8D8asAn4BnwBNpTQzxRgNdAIXAZ6gZtAB1AFLAAmjjb8ZuAnMKhNRKzL2McEoBx4APQB3cBF4CxwGjij388Dp4DlwLjRgN8Ygb8P3AUeAx+BNSn7mAZ0qf8l4JzCCnSnjr5AF4F2oE0/K2XGSoHf4ICX0bsDPALeAatSwN8DbuvoJsG3Ai1AM9AEHAEmh8CvN+B7Fegh8BpYaoRNdwnwjdr2AGOzwK8FfiTAy8K7AfQDr4CFjn7K1T8Uvh44qb8XZREgi/RpCvge4LqGyBNHtulPGfOtBvwJbXUyo2kFDAC/NIS+G/BvgCHgpSy8WB+rVbgPviNyragCXPACfhxoAOannoUIyFdj5IcMv0aNfx+8pM5lskCBMs3/Ddri8Ef1+7YQAZ898Nck9g2/K5rnXWEj15Y5fBaq8Dh8rX4eChHwyQMvef2F4dero++KeblW5vAp03UQh6/R1hAi4IMH/irw3PDrMxZs0fBrdsDLXnBYfEMEvPfAS4g8M/xuGdnGC8LwfRd8dTxRpBXw1gMvhdig4ddjpMrmBAG1Dngp9NpDBLzxwF+K5/6YX5eR55ME1DjgD4YKGPLAX5B6yPC7bGxSTYZfqwf+QGgIvfLAS3kwYPidN3ZYawZaPfCV1uK3BLzwwMsO22/4dRrlQZKAagf8vlABzz3wkuP7DL+iUdskCahywO8NFfDMAy+76a0EEF9t02L4tXngpaTuCBEw6IGXEOkx/JqNwswS0O6Br5C0HCJgQAW4qsou15EvUhK44I/JtQQBlQ74XaEz0K0h5KoqZVZWGEWZq6oUAdUJIbTPAS+Ho84QAfU60q6qcuRziY56mcLXa3NVlfJ7q/G8ogd+Z6iAlVoW+AqzP0qESNy74GuSDiYM9+2C3yGDGCJgkm5kpzMeA13wtfof79GQ4f5d8NuFIbMA7XSNHk5KgT+io7/Y0f8W7beos+yC36brcKSVZxEwXhdfZwnwcm+/620bwz7VxsgL/FYVullDzLsZ+kRMVci2QPijvhdUwHQdlAMp4Ct0lmZkEqAPmjyiPkPMNyjY1IS+p6uI/SngZ2aGjzxonKbKOkfGOaatTsHl3uK0L2mBGZF9IA6/W5PIrGB4x2vDedp5lc5EvcayPHh+6hdREZPR1QVdEYPvGDX4v23ArEg6HQmbuYX/yYDZGk7S5vxrntxyyy23gmm/AQ1Bp0TJvGKyAAAAAElFTkSuQmCC',
  },
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

