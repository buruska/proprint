const SUPPORTERS = [
  {
    name: "NKA",
    href: "https://nka.hu/",
    imageSrc: "/supporters/nka.jpg",
  },
  {
    name: "Communitas Alapítvány",
    href: "https://communitas.ro/",
    imageSrc: "/supporters/com.jpg",
  },
  {
    name: "Bethlen Gábor Alapkezelő Zrt.",
    href: "https://bgazrt.hu/tamogatasok/",
    imageSrc: "/supporters/bga.jpg",
  },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <p className="site-footer__copyright">
          Copyright © {currentYear} Pro-Print Kiadó. Minden jog fenntartva.
        </p>

        <div className="site-footer__supporters">
          <span className="site-footer__supporters-label">Támogatóink:</span>
          <div className="site-footer__supporters-links">
            {SUPPORTERS.map((supporter) => (
              <a
                key={supporter.name}
                href={supporter.href}
                className="site-footer__supporter-link"
                aria-label={supporter.name}
                title={supporter.name}
                target="_blank"
                rel="noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={supporter.imageSrc}
                  alt={supporter.name}
                  className="site-footer__supporter-logo"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
