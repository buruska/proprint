"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { type OrderStatus } from "@/lib/order-status";
import { formatCurrency, normalizeSearchValue } from "@/lib/utils";

import styles from "./admin-orders-list.module.css";

type NormalizedOrderItem = {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  status: string;
};

type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  shippingAddress: string;
  phone: string;
  email: string;
  orderedAt: string;
  status: OrderStatus;
  items: NormalizedOrderItem[];
  totalQuantity: number;
  totalPrice: number;
};

type ActionState = {
  message: string;
};

type OrderMutationAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatItemStatus(status: string) {
  if (status === "in-stock") {
    return "Raktáron";
  }

  if (status === "preorder") {
    return "Előrendelhető";
  }

  return status;
}

function OrderActionButton({
  idleLabel,
  pendingLabel,
  className,
  disabled,
}: {
  idleLabel: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={disabled || pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function OrderActionForm({
  orderId,
  action,
  actionLabel,
  pendingLabel,
  className,
  disabled,
}: {
  orderId: string;
  action: OrderMutationAction;
  actionLabel: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const [, formAction] = useActionState(action, { message: "" });

  return (
    <form action={formAction} className={styles.actionForm}>
      <input type="hidden" name="orderId" value={orderId} />
      <OrderActionButton
        idleLabel={actionLabel}
        pendingLabel={pendingLabel}
        className={className}
        disabled={disabled}
      />
    </form>
  );
}

export function AdminOrdersList({
  orders,
  onCompleteOrder,
  onDeleteOrder,
}: {
  orders: AdminOrderListItem[];
  onCompleteOrder: OrderMutationAction;
  onDeleteOrder: OrderMutationAction;
}) {
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");
  const [selectedCompletedOrder, setSelectedCompletedOrder] =
    useState<AdminOrderListItem | null>(null);
  const allPendingOrders = orders.filter((order) => order.status !== "Teljesítve");
  const allCompletedOrders = orders.filter((order) => order.status === "Teljesítve");
  const normalizedPendingQuery = normalizeSearchValue(pendingSearchQuery);
  const normalizedCompletedQuery = normalizeSearchValue(completedSearchQuery);
  const pendingOrders = normalizedPendingQuery
    ? allPendingOrders.filter((order) =>
        normalizeSearchValue(order.customerName).includes(normalizedPendingQuery),
      )
    : allPendingOrders;
  const completedOrders = normalizedCompletedQuery
    ? allCompletedOrders.filter((order) =>
        normalizeSearchValue(order.customerName).includes(normalizedCompletedQuery),
      )
    : allCompletedOrders;
  const totalOrders = orders.length;
  const totalBooks = orders.reduce(
    (sum: number, order: AdminOrderListItem) => sum + order.totalQuantity,
    0,
  );
  const totalRevenue = orders.reduce(
    (sum: number, order: AdminOrderListItem) => sum + order.totalPrice,
    0,
  );
  const hasPendingSearch = normalizedPendingQuery.length > 0;
  const hasCompletedSearch = normalizedCompletedQuery.length > 0;

  useEffect(() => {
    if (!selectedCompletedOrder) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCompletedOrder(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCompletedOrder]);

  return (
    <>
      <div className="admin-card">
        <div className={`admin-card__header ${styles.pageHeader}`}>
          <div>
            <p className="eyebrow">Rendelések</p>
            <h3>Beérkezett rendelések</h3>
          </div>
          <p className="admin-meta-note">
            Az itt látható lista közvetlenül a MongoDB-ben tárolt rendelésekből épül fel.
          </p>
        </div>

        <div className="metric-row">
          <div className="metric-card">
            <strong>{totalOrders}</strong>
            <span>Összes rendelés</span>
          </div>
          <div className="metric-card">
            <strong>{totalBooks}</strong>
            <span>Megrendelt könyv</span>
          </div>
          <div className="metric-card">
            <strong>{formatCurrency(totalRevenue)}</strong>
            <span>Rendelések összértéke</span>
          </div>
        </div>

        <p className="admin-meta-note">
          Függőben: <strong>{allPendingOrders.length}</strong> | Teljesítve: <strong>{allCompletedOrders.length}</strong>
        </p>
      </div>

      <div className="admin-card">
        <div className={`admin-card__header ${styles.listHeader}`}>
          <div>
            <p className="eyebrow">Függőben</p>
            <h3>Aktív rendelések</h3>
          </div>
          <p className="admin-meta-note">
            {pendingOrders.length === 0
              ? hasPendingSearch
                ? "Nincs találat a függő rendelések között."
                : "Nincs függőben lévő rendelés."
              : `${pendingOrders.length} függőben lévő rendelés.`}
          </p>
        </div>

        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            <span>Keresés az aktív rendelések között</span>
            <input
              type="search"
              value={pendingSearchQuery}
              onChange={(event) => setPendingSearchQuery(event.target.value)}
              placeholder="Például Kovács Anna"
              className={styles.searchInput}
            />
          </label>
        </div>

        {pendingOrders.length === 0 ? (
          <p className={styles.emptyState}>
            {hasPendingSearch
              ? "A keresett névhez nem tartozik függőben lévő rendelés."
              : "Jelenleg nincs feldolgozás alatt álló rendelés."}
          </p>
        ) : (
          <div className={styles.orderList}>
            {pendingOrders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderIdentity}>
                    <p className={styles.orderNumber}>{order.orderNumber}</p>
                    <h4>{order.customerName}</h4>
                    <p className={styles.orderDate}>{formatOrderDate(order.orderedAt)}</p>
                  </div>

                  <div className={styles.orderSummary}>
                    <span className={styles.statusBadge}>{order.status}</span>
                    <strong>{formatCurrency(order.totalPrice)}</strong>
                    <small>{order.totalQuantity} db könyv</small>
                  </div>
                </div>

                <div className={styles.orderMetaGrid}>
                  <section className={styles.metaCard}>
                    <p className={styles.metaLabel}>Kapcsolat</p>
                    <p>{order.customerName}</p>
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                    <a href={`tel:${order.phone}`}>{order.phone}</a>
                  </section>

                  <section className={styles.metaCard}>
                    <p className={styles.metaLabel}>Szállítási cím</p>
                    <p>{order.shippingAddress}</p>
                  </section>
                </div>

                <section className={styles.itemsSection}>
                  <p className={styles.metaLabel}>Tételek</p>
                  <div className={styles.itemsList}>
                    {order.items.map((item, index) => (
                      <div
                        key={`${order.id}-${item.bookId || item.title}-${index}`}
                        className={styles.itemRow}
                      >
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.author}</span>
                        </div>
                        <div className={styles.itemSummary}>
                          <span>{item.quantity} db</span>
                          <span>{formatCurrency(item.price)}</span>
                          <small>{formatItemStatus(item.status)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className={styles.actionsRow}>
                  <OrderActionForm
                    orderId={order.id}
                    action={onCompleteOrder}
                    actionLabel="Teljesítés"
                    pendingLabel="Teljesítés..."
                    className={styles.completeButton}
                  />
                  <OrderActionForm
                    orderId={order.id}
                    action={onDeleteOrder}
                    actionLabel="Törlés"
                    pendingLabel="Törlés..."
                    className={styles.deleteButton}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className={`admin-card__header ${styles.listHeader}`}>
          <div>
            <p className="eyebrow">Teljesítve</p>
            <h3>Lezárt rendelések</h3>
          </div>
          <p className="admin-meta-note">
            {completedOrders.length === 0
              ? hasCompletedSearch
                ? "Nincs találat a teljesített rendelések között."
                : "Még nincs teljesített rendelés."
              : `${completedOrders.length} teljesített rendelés.`}
          </p>
        </div>

        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            <span>Keresés a lezárt rendelések között</span>
            <input
              type="search"
              value={completedSearchQuery}
              onChange={(event) => setCompletedSearchQuery(event.target.value)}
              placeholder="Például Kovács Anna"
              className={styles.searchInput}
            />
          </label>
        </div>

        {completedOrders.length === 0 ? (
          <p className={styles.emptyState}>
            {hasCompletedSearch
              ? "A keresett névhez nem tartozik teljesített rendelés."
              : "A teljesített rendelések listája még üres."}
          </p>
        ) : (
          <div className={styles.compactList}>
            {completedOrders.map((order) => (
              <article key={order.id} className={styles.compactRow}>
                <strong>{order.orderNumber}</strong>
                <span>{order.customerName}</span>
                <time dateTime={order.orderedAt}>{formatOrderDate(order.orderedAt)}</time>
                <button
                  type="button"
                  className={styles.detailsButton}
                  onClick={() => setSelectedCompletedOrder(order)}
                >
                  Részletek
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedCompletedOrder ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedCompletedOrder(null)}
        >
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="completed-order-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">Lezárt rendelés</p>
                <h3 id="completed-order-details-title">
                  {selectedCompletedOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setSelectedCompletedOrder(null)}
                aria-label="Részletek bezárása"
              >
                Bezárás
              </button>
            </div>

            <div className={styles.modalMetaGrid}>
              <section className={styles.metaCard}>
                <p className={styles.metaLabel}>Kapcsolat</p>
                <p>{selectedCompletedOrder.customerName}</p>
                <a href={`mailto:${selectedCompletedOrder.email}`}>
                  {selectedCompletedOrder.email}
                </a>
                <a href={`tel:${selectedCompletedOrder.phone}`}>
                  {selectedCompletedOrder.phone}
                </a>
              </section>

              <section className={styles.metaCard}>
                <p className={styles.metaLabel}>Szállítási cím</p>
                <p>{selectedCompletedOrder.shippingAddress}</p>
                <p className={styles.orderDate}>
                  {formatOrderDate(selectedCompletedOrder.orderedAt)}
                </p>
                <p className={styles.modalTotal}>
                  Összesen: {formatCurrency(selectedCompletedOrder.totalPrice)}
                </p>
              </section>
            </div>

            <section className={styles.itemsSection}>
              <p className={styles.metaLabel}>Tételek</p>
              <div className={styles.itemsList}>
                {selectedCompletedOrder.items.map((item, index) => (
                  <div
                    key={`${selectedCompletedOrder.id}-${item.bookId || item.title}-${index}`}
                    className={styles.itemRow}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.author}</span>
                    </div>
                    <div className={styles.itemSummary}>
                      <span>{item.quantity} db</span>
                      <span>{formatCurrency(item.price)}</span>
                      <small>{formatItemStatus(item.status)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
