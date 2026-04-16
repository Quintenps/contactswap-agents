import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

