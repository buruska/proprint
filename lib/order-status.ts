export const ORDER_STATUS_VALUES = ["Feldolgozás alatt", "Teljesítve"] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "Feldolgozás alatt": "Feldolgozás alatt",
  "Teljesítve": "Teljesítve",
};
