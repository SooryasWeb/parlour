import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SooryasWeb',
  description: 'Internal parlour operations app for Sooryas Skin Hair and Makeup.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
