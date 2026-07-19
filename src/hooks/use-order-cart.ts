import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ComposerLineRequest } from "@/shared/waiter/schemas";

export type CartItem = ComposerLineRequest & {
  cartItemId: string; // Unique transient ID for the cart
};

interface OrderCartState {
  itemsByTicket: Record<string, CartItem[]>;
  addItem: (ticketId: string, item: Omit<CartItem, "cartItemId">) => void;
  updateItem: (
    ticketId: string,
    cartItemId: string,
    updates: Partial<Omit<CartItem, "cartItemId">>,
  ) => void;
  removeItem: (ticketId: string, cartItemId: string) => void;
  clearCart: (ticketId: string) => void;
}

export const useOrderCart = create<OrderCartState>()(
  persist(
    (set) => ({
      itemsByTicket: {},
      addItem: (ticketId, item) =>
        set((state) => {
          const items = state.itemsByTicket[ticketId] || [];
          return {
            itemsByTicket: {
              ...state.itemsByTicket,
              [ticketId]: [
                ...items,
                { ...item, cartItemId: crypto.randomUUID() },
              ],
            },
          };
        }),
      updateItem: (ticketId, cartItemId, updates) =>
        set((state) => {
          const items = state.itemsByTicket[ticketId] || [];
          return {
            itemsByTicket: {
              ...state.itemsByTicket,
              [ticketId]: items.map((i) =>
                i.cartItemId === cartItemId ? { ...i, ...updates } : i,
              ),
            },
          };
        }),
      removeItem: (ticketId, cartItemId) =>
        set((state) => {
          const items = state.itemsByTicket[ticketId] || [];
          return {
            itemsByTicket: {
              ...state.itemsByTicket,
              [ticketId]: items.filter((i) => i.cartItemId !== cartItemId),
            },
          };
        }),
      clearCart: (ticketId) =>
        set((state) => {
          const newMap = { ...state.itemsByTicket };
          delete newMap[ticketId];
          return { itemsByTicket: newMap };
        }),
    }),
    {
      name: "waiter-order-cart",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
