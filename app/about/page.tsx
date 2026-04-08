import type { Metadata } from "next";

import { getAboutPageContent } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Kiadóról",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await getAboutPageContent();

  return (
    <section className="section">
      <div className="shell page-intro">
        {content.eyebrow ? <p className="eyebrow page-title-label">{content.eyebrow}</p> : null}

        <div className="editorial-panel editorial-panel--single">
          <article
            className="rich-content about-page-content"
            dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
          />
        </div>
      </div>
    </section>
  );
}
