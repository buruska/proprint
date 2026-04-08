import type { Metadata } from "next";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Kapcsolat",
};

export default function ContactPage() {
  return (
    <section className="section">
      <div className="shell">
        <div className="contact-layout">
          <div className="contact-cards">
            <article className="info-card">
              <p className="eyebrow">Cím</p>
              <p className={styles.infoText}>530232 Csíkszereda, Nagyrét u. 22 sz.</p>
              <p className={styles.infoText}>Hargita megye, Románia</p>
            </article>

            <article className="info-card">
              <p className="eyebrow">Telefon</p>
              <a href="tel:0266314257" className="contact-link">
                0266-314257
              </a>
              <a href="tel:0744625733" className="contact-link">
                0744 625733
              </a>
            </article>

            <article className="info-card">
              <p className="eyebrow">Email</p>
              <a href="mailto:proprintkiado@gmail.com" className="contact-link">
                proprintkiado@gmail.com
              </a>
            </article>

            <article className="info-card">
              <p className="eyebrow">Facebook</p>
              <a
                href="https://www.facebook.com/proprint.kiado"
                target="_blank"
                rel="noreferrer"
                className={styles.socialLink}
                aria-label="Pro-Print Konyvkiado Facebook oldal megnyitasa uj lapon"
              >
                <span className={styles.socialIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false">
                    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.2v2.3H8.1V14h2.8v8h2.6Z" />
                  </svg>
                </span>
                <span>facebook.com/proprint.kiado</span>
              </a>
            </article>
          </div>

          <div className="contact-form-panel">
            <p className="eyebrow">Térkép</p>
            <h3>Székhelyünk</h3>
            <div className={styles.mapFrame}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1632.8903877562839!2d25.799917324939013!3d46.36641219417421!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x474b2a08aefc9e8f%3A0x5ce6bb5050de89a7!2sPro-Print%20S.R.L.!5e1!3m2!1sen!2sro!4v1775646839030!5m2!1sen!2sro"
                width="600"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={styles.mapEmbed}
                title="Pro-Print térkép"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
