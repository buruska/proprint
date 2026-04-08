import type { Metadata } from "next";

import { CartPageClient } from "./cart-page-client";

export const metadata: Metadata = {
  title: "Kosár",
};

export default function CartPage() {
  return (
    <section className="section">
      <div className="shell page-intro">
        <CartPageClient />
      </div>
    </section>
  );
}
