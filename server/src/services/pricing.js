export function calculateOrderTotals(items, orderType, discountPercent = 0) {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.itemTotal, 0) * 100) / 100;
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 20) {
    throw new RangeError('Discount must be between 0 and 20 percent');
  }
  const discount = Math.round(subtotal * discountPercent) / 100;
  const tax = Math.round((subtotal - discount) * 0.05 * 100) / 100;
  const deliveryFee = orderType === 'delivery' ? 40 : 0;
  return { subtotal, discount, tax, deliveryFee, total: Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100 };
}
