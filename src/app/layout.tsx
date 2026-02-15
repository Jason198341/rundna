import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import SkinInit from "@/components/SkinInit";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RunDNA — AI Running Intelligence",
  description: "Connect your Strava. Discover your Running DNA. Get AI-powered coaching, race plans, and weekly reports.",
  keywords: ["running", "AI", "Strava", "analytics", "coaching", "marathon", "training"],
  metadataBase: new URL("https://rundna.online"),
  openGraph: {
    title: "RunDNA — AI Running Intelligence",
    description: "Connect your Strava. Discover your Running DNA.",
    siteName: "RunDNA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RunDNA — AI Running Intelligence",
    description: "Connect your Strava. Discover your Running DNA.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <meta name="google-adsense-account" content="ca-pub-7851278292826132" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7851278292826132"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkinInit />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
