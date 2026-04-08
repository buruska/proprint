import type { Metadata } from "next";

import { CheckoutPageClient } from "./checkout-page-client";

export const metadata: Metadata = {
  title: "Rendelési adatok",
};

export default function CheckoutPage() {
  return (
    <section className="section">
      <div className="shell page-intro">
        <CheckoutPageClient />
      </div>
    </section>
  );
}
