import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency } from '../../client/src/utils.js';

test('shared formatter displays Indian Rupees with Indian grouping', () => {
  assert.equal(formatCurrency(123456.5), '₹1,23,456.50');
  assert.equal(formatCurrency('not-a-number'), '₹0.00');
});
