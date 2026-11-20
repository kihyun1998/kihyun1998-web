import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { LanguageProvider } from '@/components/language';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { coverScript } from '@/lib/cabin-cover';
import { SITE_ORIGIN } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: 'Ki Hyun Park',
  description:
    "I'm a developer interested in defining problems and solving them.",
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Ki Hyun Park',
    description:
      "I'm a developer interested in defining problems and solving them.",
    url: SITE_ORIGIN,
    siteName: 'Ki Hyun Park',
    type: 'website',
  },
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: coverScript }} />
        {/* AdSense approves at the domain level, and subdomains inherit the
            parent's status, so the loader is on this apex domain although the
            ads run on blog.kihyun1998.com. Google asks for it "between the
            <head> and </head> tags of your site", on every page.

            A raw <script>, not next/script: under the App Router,
            `afterInteractive` with a src only calls ReactDOM.preload and
            renders null, and `beforeInteractive` emits a preload plus a
            bootstrap push; neither puts a <script src> in the HTML the server
            sends, so a crawler that does not run JavaScript sees no tag. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8392839309180094"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <LanguageProvider>
          <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
            <SiteHeader />
            {children}
            <SiteFooter />
          </main>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
