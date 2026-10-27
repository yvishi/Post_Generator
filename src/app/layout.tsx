import type { Metadata } from 'next';
import { Bitter, Hanken_Grotesk, JetBrains_Mono, Kalam } from 'next/font/google';
import './globals.css';

const bitter = Bitter({ variable: '--font-bitter', subsets: ['latin'], weight: ['500', '700'] });
const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400', '500'] });
const kalam = Kalam({ variable: '--font-kalam', subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Vidya content desk',
  description: 'Research, draft and check posts and ads for Vidya AI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bitter.variable} ${hanken.variable} ${jetbrains.variable} ${kalam.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
