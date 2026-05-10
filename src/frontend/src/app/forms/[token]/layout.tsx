import type { ReactNode } from 'react';

type FormsTokenLayoutProps = {
  children: ReactNode;
};

export function generateStaticParams() {
  return [{ token: 'demo' }];
}

export default function FormsTokenLayout({ children }: FormsTokenLayoutProps) {
  return children;
}
