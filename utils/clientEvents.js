export const INVENTORY_CHANGE_EVENT = "stocksense:data-changed";
export const ITEM_ADDED_EVENT = "stocksense:item-added";

export function emitInventoryChange(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INVENTORY_CHANGE_EVENT, { detail }));
}

export function emitItemAdded(item) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ITEM_ADDED_EVENT, {
      detail: { item },
    })
  );

  emitInventoryChange({
    entity: "item",
    action: "added",
    item,
  });
}
