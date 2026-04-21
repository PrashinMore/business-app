/**
 * Inventory UX helpers.
 *
 * Centralised rules for how the app reacts to a product's inventoryType so
 * the menu screen, cart context and checkout screen all agree:
 *
 *  - SIMPLE + tracked → strict on-hand limit; block oversell on the client.
 *  - RECIPE           → don't block on the client; backend validates ingredient
 *                        stock on checkout. We surface availability via a
 *                        green/amber/red badge instead of a numeric count.
 *  - NONE or !track   → no stock logic; always available.
 *
 * These predicates treat missing fields as the pre-upgrade defaults
 * (`trackInventory = true`, `inventoryType = 'SIMPLE'`) so legacy products
 * and older cached payloads continue to work unchanged.
 */

import { CartItem, InventoryType, Product } from '../types/menu';

export type AvailabilityBadge = 'available' | 'low' | 'out' | 'untracked';

export function getInventoryType(product: Product): InventoryType {
  return product.inventoryType ?? 'SIMPLE';
}

export function isInventoryTracked(product: Product): boolean {
  // Untracked products (or inventoryType === 'NONE') never gate on stock.
  return (product.trackInventory ?? true) && getInventoryType(product) !== 'NONE';
}

/** True when we can oversell this product from the client if stock runs out. */
export function isRecipeProduct(product: Product): boolean {
  return getInventoryType(product) === 'RECIPE';
}

/**
 * Returns the high-level availability bucket for a product. We intentionally
 * keep this coarse — the cashier only needs to know green / amber / red,
 * not a precise count for RECIPE items (which has to be derived from
 * ingredient stock and is authoritative only on the backend).
 */
export function getAvailability(product: Product): AvailabilityBadge {
  if (!isInventoryTracked(product)) {
    return 'untracked';
  }
  const type = getInventoryType(product);
  if (type === 'RECIPE') {
    // Without an ingredient-level availability endpoint, we optimistically
    // assume the dish is available. The backend will reject at checkout if
    // ingredients are short; the cart UI handles that case.
    return 'available';
  }
  // SIMPLE + tracked
  const stock = product.stock ?? 0;
  if (stock <= 0) return 'out';
  if (stock <= (product.lowStockThreshold ?? 0)) return 'low';
  return 'available';
}

/**
 * Whether adding one more of this product should be blocked by the client.
 * Only SIMPLE+tracked products have a meaningful client-side cap — the
 * backend is the source of truth for RECIPE items.
 */
export function canAddMore(product: Product, currentQty: number): boolean {
  if (!isInventoryTracked(product)) return true;
  if (isRecipeProduct(product)) return true;
  return currentQty < (product.stock ?? 0);
}

/** Max quantity the client will allow for this product. Infinity for RECIPE/untracked. */
export function maxClientQuantity(product: Product): number {
  if (!isInventoryTracked(product)) return Number.POSITIVE_INFINITY;
  if (isRecipeProduct(product)) return Number.POSITIVE_INFINITY;
  return product.stock ?? 0;
}

/** True if any cart item has inventoryType === 'RECIPE'. */
export function cartHasRecipeItems(cart: CartItem[]): boolean {
  return cart.some((item) => isRecipeProduct(item.product));
}

/**
 * Checkout error classifier. The backend throws BadRequestException for
 * recipe / ingredient failures with specific wording; we match on lowercase
 * substrings so slight copy changes don't silently break the UX.
 */
export type CheckoutErrorKind =
  | 'insufficient_ingredients'
  | 'missing_recipe'
  | 'unknown';

export function classifyCheckoutError(error: unknown): CheckoutErrorKind {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = message.toLowerCase();

  if (lower.includes('insufficient') && lower.includes('ingredient')) {
    return 'insufficient_ingredients';
  }
  // "No recipe configured", "Recipe not found", etc.
  if (lower.includes('recipe') && (lower.includes('no ') || lower.includes('not'))) {
    return 'missing_recipe';
  }
  return 'unknown';
}
