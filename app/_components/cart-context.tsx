"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { BookStatus } from "@/lib/book-status";

type CartItem = {
  id: string;
  title: string;
  author: string;
  price: number;
  coverImageUrl: string;
  quantity: number;
  status: BookStatus;
};

type CartItemInput = Omit<CartItem, "quantity">;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (item: CartItemInput, quantity: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "proprint-cart";
const CART_UPDATED_EVENT = "proprint-cart-updated";
const EMPTY_CART: CartItem[] = [];
const EMPTY_CART_SERIALIZED = "[]";

const CartContext = createContext<CartContextValue | null>(null);

let cachedCartItems: CartItem[] = EMPTY_CART;
let cachedSerializedCart = EMPTY_CART_SERIALIZED;

function parseStoredCart(rawValue: string | null) {
  if (!rawValue) {
    return EMPTY_CART;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return EMPTY_CART;
    }

    const nextItems = parsedValue.filter((item): item is CartItem => {
      return Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as CartItem).id === "string" &&
          typeof (item as CartItem).title === "string" &&
          typeof (item as CartItem).author === "string" &&
          typeof (item as CartItem).price === "number" &&
          typeof (item as CartItem).coverImageUrl === "string" &&
          typeof (item as CartItem).quantity === "number" &&
          typeof (item as CartItem).status === "string",
      );
    });

    return nextItems.length > 0 ? nextItems : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function syncCartCache() {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  const rawValue = window.localStorage.getItem(CART_STORAGE_KEY) ?? EMPTY_CART_SERIALIZED;

  if (rawValue === cachedSerializedCart) {
    return cachedCartItems;
  }

  cachedSerializedCart = rawValue;
  cachedCartItems = parseStoredCart(rawValue);

  return cachedCartItems;
}

function emitCartUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function readStoredCart() {
  return syncCartCache();
}

function writeStoredCart(nextItems: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serializedValue = JSON.stringify(nextItems);
  cachedSerializedCart = serializedValue;
  cachedCartItems = nextItems.length > 0 ? nextItems : EMPTY_CART;
  window.localStorage.setItem(CART_STORAGE_KEY, serializedValue);
  emitCartUpdated();
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      syncCartCache();
      onStoreChange();
    }
  };

  const handleLocalUpdate = () => {
    syncCartCache();
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CART_UPDATED_EVENT, handleLocalUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CART_UPDATED_EVENT, handleLocalUpdate);
  };
}

function getCartSnapshot() {
  return syncCartCache();
}

function getCartServerSnapshot() {
  return EMPTY_CART;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getCartSnapshot, getCartServerSnapshot);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    addItem(item, quantity) {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return;
      }

      const current = readStoredCart();
      const existingItem = current.find((currentItem) => currentItem.id === item.id);

      if (!existingItem) {
        writeStoredCart([...current, { ...item, quantity }]);
        return;
      }

      writeStoredCart(
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, quantity: currentItem.quantity + quantity }
            : currentItem,
        ),
      );
    },
    updateQuantity(id, quantity) {
      const current = readStoredCart();

      if (quantity <= 0) {
        writeStoredCart(current.filter((item) => item.id !== id));
        return;
      }

      writeStoredCart(
        current.map((item) =>
          item.id === id
            ? { ...item, quantity }
            : item,
        ),
      );
    },
    removeItem(id) {
      writeStoredCart(readStoredCart().filter((item) => item.id !== id));
    },
    clearCart() {
      writeStoredCart(EMPTY_CART);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}
