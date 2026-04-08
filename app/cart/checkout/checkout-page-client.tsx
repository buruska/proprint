"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useCart } from "@/app/_components/cart-context";
import { formatCurrency } from "@/lib/utils";

import styles from "./checkout-page-client.module.css";

type CheckoutFormState = {
  name: string;
  shippingAddress: string;
  phone: string;
  email: string;
};

type CheckoutFeedback = {
  tone: "error";
  message: string;
};

type CheckoutListSectionProps = {
  title: string;
  items: ReturnType<typeof useCart>["items"];
};

const initialFormState: CheckoutFormState = {
  name: "",
  shippingAddress: "",
  phone: "",
  email: "",
};

function formatCartLine(item: ReturnType<typeof useCart>["items"][number]) {
  const parts = [item.author.trim(), item.title.trim()].filter(Boolean);
  const label = parts.join(": ");

  return `${item.quantity} db - ${label || "Cím nélküli tétel"} - ${formatCurrency(item.price)}`;
}

function CheckoutListSection({ title, items }: CheckoutListSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={styles.listSection}>
      <h3>{title}</h3>
      <ul className={styles.itemList}>
        {items.map((item) => (
          <li key={item.id} className={styles.itemListEntry}>
            {formatCartLine(item)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CheckoutPageClient() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [formData, setFormData] = useState<CheckoutFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<CheckoutFeedback | null>(null);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const inStockItems = items.filter((item) => item.status === "in-stock");
  const preorderItems = items.filter((item) => item.status === "preorder");
  const isFormComplete = useMemo(() => {
    return Object.values(formData).every((value) => value.trim().length > 0);
  }, [formData]);

  function handleFieldChange(field: keyof CheckoutFormState, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: formData,
          items,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Nem sikerült rögzíteni a rendelést.");
      }

      clearCart();
      router.push("/books?orderSuccess=1");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Nem sikerült rögzíteni a rendelést.",
      });
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <article className="info-card">
        <h3>A kosár jelenleg üres.</h3>
        <p>
          Előbb tegyél könyveket a kosárba, és utána itt tudod megadni a rendelési adatokat.
        </p>
        <div className={styles.emptyActions}>
          <Link href="/books" className={styles.primaryAction}>
            Tovább a könyvekhez
          </Link>
          <Link href="/cart" className={styles.secondaryAction}>
            Vissza a kosárhoz
          </Link>
        </div>
      </article>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.formPanel}>
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Rendelési adatok</p>
            <h1>Töltsd ki a megrendeléshez szükséges adatokat</h1>
          </div>
          <p className={styles.intro}>
            Add meg a kapcsolattartási és postázási adatokat, alatta pedig ellenőrizheted a
            kosár tartalmát egyszerű listában.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Név</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={formData.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Postázási cím</span>
            <textarea
              name="shippingAddress"
              rows={4}
              autoComplete="street-address"
              required
              value={formData.shippingAddress}
              onChange={(event) => handleFieldChange("shippingAddress", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Telefonszám</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              required
              value={formData.phone}
              onChange={(event) => handleFieldChange("phone", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>E-mail cím</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(event) => handleFieldChange("email", event.target.value)}
            />
          </label>

          <button
            type="submit"
            className={styles.orderButton}
            disabled={!isFormComplete || isSubmitting}
          >
            {isSubmitting ? "Rendelés mentése..." : "Rendelés"}
          </button>

          {feedback ? (
            <p className={styles.feedbackError}>
              {feedback.message}
            </p>
          ) : null}
        </form>
      </section>

      <aside className={styles.summaryPanel}>
        <p className="eyebrow">Kosár tartalma</p>
        <h2>Összesítés</h2>
        <CheckoutListSection title="Rendelhető tételek" items={inStockItems} />
        <CheckoutListSection title="Előrendelhető tételek" items={preorderItems} />
        <p className={styles.total}>
          Végösszeg: <strong>{formatCurrency(total)}</strong>
        </p>
        <div className={styles.actions}>
          <Link href="/cart" className={styles.secondaryAction}>
            Vissza a kosárhoz
          </Link>
        </div>
      </aside>
    </div>
  );
}
