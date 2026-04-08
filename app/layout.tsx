import type { Metadata } from "next";

import { CartProvider } from "@/app/_components/cart-context";
import { SiteFrame } from "@/app/_components/site-frame";
import { siteMeta } from "@/lib/data";

import "leaflet/dist/leaflet.css";
import "./globals.css";

const siteTitle = "Pro-Print Kiadó";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteMeta.description,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <SiteFrame>{children}</SiteFrame>
        </CartProvider>
      </body>
    </html>
  );
}
