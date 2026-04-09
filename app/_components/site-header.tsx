"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/app/_components/cart-context";

const navItems = [
  { href: "/about", label: "Kiadóról" },
  { href: "/books", label: "Könyveink" },
  { href: "/handmade", label: "Handmade" },
  { href: "/rendezvenyek", label: "Rendezvények" },
  { href: "/services", label: "Szolgáltatásaink" },
  { href: "/contact", label: "Kapcsolat" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 760) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand-mark" aria-label="ProPrint Kiadó főoldal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/PP_logo.png"
            alt="ProPrint Kiadó"
            className="brand-mark__logo"
          />
        </Link>

        <button
          type="button"
          className={isMenuOpen ? "site-nav-toggle site-nav-toggle--open" : "site-nav-toggle"}
          aria-expanded={isMenuOpen}
          aria-controls="site-nav"
          aria-label={isMenuOpen ? "Menü bezárása" : "Menü megnyitása"}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="site-nav"
          className={isMenuOpen ? "site-nav site-nav--open" : "site-nav"}
          aria-label="Fő navigáció"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "site-nav__link site-nav__link--active" : "site-nav__link"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/cart"
            className={pathname === "/cart" ? "site-nav__cart site-nav__link--active" : "site-nav__cart"}
            aria-current={pathname === "/cart" ? "page" : undefined}
            aria-label="Kosár megtekintése"
            title="Kosár"
            onClick={() => setIsMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="site-nav__cart-icon">
              <path
                d="M3 4h2.2l1.2 6.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4l1.5-4.8H7.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="18" r="1.6" fill="currentColor" />
              <circle cx="17" cy="18" r="1.6" fill="currentColor" />
            </svg>
            {itemCount > 0 ? <span className="site-nav__cart-badge">{itemCount}</span> : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
