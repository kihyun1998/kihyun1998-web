import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LanguageProvider } from '@/components/language';
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
  metadataBase: new URL('https://kihyun1998.com'),
  title: 'Ki Hyun Park',
  description:
    "I'm a developer interested in defining problems and solving them.",
  openGraph: {
    title: 'Ki Hyun Park',
    description:
      "I'm a developer interested in defining problems and solving them.",
    url: 'https://kihyun1998.com',
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
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
