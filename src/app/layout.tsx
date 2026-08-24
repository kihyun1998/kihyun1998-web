import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { LanguageProvider } from '@/components/language';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SITE_ORIGIN } from '@/lib/site';
import './globals.css';

// Inter is self-hosted by next/font and exposed as --font-inter, which
// globals.css feeds into --font-sans. Pretendard is loaded via CDN (below)
// and sits next in the stack, so Latin glyphs render in Inter and Korean
// glyphs fall through to Pretendard per-glyph. See ADR-0002.
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
  // Non-www is the canonical host; www 301s here. Stated explicitly so Google
  // never has to guess which variant to index.
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

// Applied before first paint so the OS theme (or stored override) is set with
// no flash of the wrong theme. Mirrors the logic in theme-toggle.tsx.
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
        {/* AdSense loader. This is the apex domain, and AdSense reviews and
            approves at the *domain* level — subdomains cannot be registered
            separately and inherit the parent's status — so this site is the
            one under review even though the ads run on blog.kihyun1998.com.
            It carried ads.txt but never the code itself.

            Google's instruction is literal about the placement: "you need to
            paste it between the <head> and </head> tags of your site", on
            every page. This layout is every page.

            A raw <script>, deliberately — NOT next/script. Under appDir,
            `afterInteractive` with a src only calls ReactDOM.preload and
            renders null, and `beforeInteractive` emits a preload plus a
            bootstrap push; neither puts a <script src> in the HTML the server
            sends. A crawler that does not run JS sees no tag at all. That was
            measured in the blog repo (its #87) and cost a full review cycle.

            No <ins> ad units here on purpose: they are not required for
            review, and these are navigation-shaped pages. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8392839309180094"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <LanguageProvider>
          {/* Top padding is tuned so a phone's first viewport carries the
              Identity Statement and the start of the first section, rather
              than the header and whitespace. */}
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
