"use client";

import Link from "next/link";

import { useCart } from "@/app/_components/cart-context";
import { formatCurrency } from "@/lib/utils";

import styles from "./cart-page-client.module.css";

type CartSectionProps = {
  title: string;
  description: string;
  items: ReturnType<typeof useCart>["items"];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
};

function CartSection({
  title,
  description,
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <div>
          <p className="eyebrow">Kosár</p>
          <h2>{title}</h2>
        </div>
        <p className={styles.groupDescription}>{description}</p>
      </div>

      <div className={styles.groupItems}>
        {items.map((item) => (
          <article key={item.id} className={styles.itemCard}>
            <div className={styles.itemCoverWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.coverImageUrl || "/book-placeholder.svg"}
                alt={`${item.title} borítója`}
                className={styles.itemCover}
              />
            </div>

            <div className={styles.itemMeta}>
              <p className="eyebrow">Kosárban</p>
              <h3>{item.title}</h3>
              <p className={styles.author}>{item.author}</p>
              <p className={styles.price}>{formatCurrency(item.price)}</p>
            </div>

            <div className={styles.itemActions}>
              <div className={styles.quantityControl}>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  aria-label={`${item.title} mennyiségének csökkentése`}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  aria-label={`${item.title} mennyiségének növelése`}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemoveItem(item.id)}
              >
                Tétel eltávolítása
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CartPageClient() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const inStockItems = items.filter((item) => item.status === "in-stock");
  const preorderItems = items.filter((item) => item.status === "preorder");
  const inStockCount = inStockItems.reduce((sum, item) => sum + item.quantity, 0);
  const preorderCount = preorderItems.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <article className="info-card">
        <h3>A kosár jelenleg üres.</h3>
        <p>
          Válassz könyveket a katalógusból, és itt rögtön látni fogod a
          kiválasztott tételeket.
        </p>
        <Link href="/books" className={styles.backLink}>
          Tovább a könyvekhez
        </Link>
      </article>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.items}>
        <CartSection
          title="Rendelhető tételek"
          description="Ezek a könyvek jelenleg rendelhetők, így a kosárban külön csoportban jelennek meg."
          items={inStockItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
        />

        <CartSection
          title="Előrendelhető tételek"
          description="Az itt szereplő könyvek még megjelenés előtt állnak, ezért előrendelésként kezeljük őket."
          items={preorderItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
        />
      </section>

      <aside className={styles.summary}>
        <p className="eyebrow">Összesítés</p>
        <h3>Kosár összesen</h3>
        <p className={styles.summaryLine}>
          <span>Rendelhető</span>
          <strong>{inStockCount} db</strong>
        </p>
        <p className={styles.summaryLine}>
          <span>Előrendelhető</span>
          <strong>{preorderCount} db</strong>
        </p>
        <p className={styles.summaryLine}>
          <span>Tételek száma</span>
          <strong>{items.reduce((sum, item) => sum + item.quantity, 0)} db</strong>
        </p>
        <p className={styles.summaryLine}>
          <span>Végösszeg</span>
          <strong>{formatCurrency(total)}</strong>
        </p>
        <p className={styles.summaryHint}>
          A következő lépésben külön oldalon tudod megadni a rendelési adatokat.
        </p>
        <div className={styles.summaryActions}>
          <Link href="/cart/checkout" className={styles.primaryAction}>
            Tovább
          </Link>
          <Link href="/books" className={styles.secondaryAction}>
            Még válogatok
          </Link>
          <button type="button" className={styles.clearButton} onClick={clearCart}>
            Kosár ürítése
          </button>
        </div>
      </aside>
    </div>
  );
}
