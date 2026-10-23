import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderTotals } from '../src/services/pricing.js';

test('server calculates rounded INR totals and delivery fee', () => {
  assert.deepEqual(calculateOrderTotals([{ itemTotal: 199.9 }, { itemTotal: 50 }], 'delivery'), {
    subtotal: 249.9, discount: 0, tax: 12.5, deliveryFee: 40, total: 302.4
  });
});

test('server limits staff discounts and taxes the discounted subtotal', () => {
  assert.deepEqual(calculateOrderTotals([{ itemTotal: 200 }], 'takeaway', 10), {
    subtotal: 200, discount: 20, tax: 9, deliveryFee: 0, total: 189
  });
  assert.throws(() => calculateOrderTotals([{ itemTotal: 100 }], 'takeaway', 25), RangeError);
});
