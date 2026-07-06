import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { APP_FULL_NAME } from '@/lib/constants';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_FULL_NAME,
  description:
    'AI-powered investigative intelligence platform for Karnataka State Police — conversational crime querying, network discovery, offender profiling, and forecasting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-x-hidden p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
