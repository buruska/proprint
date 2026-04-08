import type { Metadata } from "next";

import { CartProvider } from "@/app/_components/cart-context";
import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
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
          <div className="page-frame">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
