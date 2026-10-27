import type { Metadata } from 'next';
import { Figtree, JetBrains_Mono, Young_Serif } from 'next/font/google';
import './globals.css';

const youngSerif = Young_Serif({ variable: '--font-young-serif', subsets: ['latin'], weight: '400' });
const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400'] });

export const metadata: Metadata = {
  title: 'Vidya content studio',
  description: 'Turn a topic or a link into ready-to-post content for Vidya AI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${youngSerif.variable} ${figtree.variable} ${jetbrains.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
