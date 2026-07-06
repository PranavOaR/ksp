import type { Metadata } from 'next';
import { Archivo, Geist_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { APP_FULL_NAME } from '@/lib/constants';
import { LanguageProvider } from '@/lib/i18n';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});
const serifNote = Source_Serif_4({
  variable: '--font-serif-note',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_FULL_NAME,
  description:
    'AI-powered investigative intelligence platform for Karnataka State Police — conversational crime querying, network discovery, offender profiling, and forecasting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${serifNote.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
