import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import NavigationProgress from "@/components/NavigationProgress";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Donasi Masjid Darul Hidayah",
  description: "Program donasi pelunasan hutang pembangunan Masjid Darul Hidayah, Titik Nol Tanah Merah, Kab. Boven Digoel",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://donasi.mdh.or.id"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Donasi MDH",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('donasi-mdh-theme');var r=document.documentElement;if(t==='dark'){r.classList.remove('light');r.classList.add('dark');}else{r.classList.remove('dark');r.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();`;

const animationsInitScript = `(function(){var r=document.documentElement;function o(){r.classList.add('animations-enabled');window.removeEventListener('load',o);}if('requestAnimationFrame'in window){window.addEventListener('load',o);}else{setTimeout(o,100);}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body text-body-md min-h-screen bg-background text-on-surface overflow-x-hidden antialiased">
        <script dangerouslySetInnerHTML={{ __html: animationsInitScript }} />
        <NavigationProgress />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
