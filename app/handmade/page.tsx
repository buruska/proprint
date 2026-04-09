import type { Metadata } from "next";

import { getHandmadePageContent } from "@/lib/handmade-content";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Handmade",
};

export const dynamic = "force-dynamic";

export default async function HandmadePage() {
  const content = await getHandmadePageContent();

  return (
    <section className="section">
      <div className="shell page-intro">
        <div className={`editorial-panel editorial-panel--single ${styles.brandIntro}`}>
          <div className={styles.logoWrap}>
            <video
              className={styles.logoVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="HendiMedi animált logó"
            >
              <source src="/hendimedi-logo.mp4" type="video/mp4" />
              <source src="/hendimedi-logo.mov" type="video/quicktime" />
            </video>
          </div>

          <div className={styles.brandCopy}>
            <p className={styles.lead}>{content.leadText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
