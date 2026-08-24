export interface WebFocusItemAttributes {
  readonly tabIndex: 0 | -1;
  readonly "data-web-focus-key": string;
}

export interface WebFocusableItem {
  getAttribute(name: string): string | null;
  focus(): void;
}

export interface WebFocusItemRoot<Item extends WebFocusableItem> {
  querySelectorAll(selectors: string): ArrayLike<Item>;
}

export function webFocusItemProps(key: string, focused: boolean): WebFocusItemAttributes {
  return { tabIndex: focused ? 0 : -1, "data-web-focus-key": key };
}

export function focusWebItem<Item extends WebFocusableItem>(
  root: WebFocusItemRoot<Item> | null,
  key: string,
): Item | null {
  if (root === null) return null;
  const items = root.querySelectorAll("[data-web-focus-key]");
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item?.getAttribute("data-web-focus-key") === key) {
      item.focus();
      return item;
    }
  }
  return null;
}
