import type { ReactNode } from 'react';

type FormTokenLayoutProps = {
  children: ReactNode;
};

export function generateStaticParams() {
  return [{ token: 'demo' }];
}

export default function FormTokenLayout({ children }: FormTokenLayoutProps) {
  return children;
}
