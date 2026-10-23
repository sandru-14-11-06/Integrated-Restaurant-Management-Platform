import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastOrders } from '../src/services/forecast.js';

test('forecast calculates a moving average from recent orders', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  const orders = [
    { createdAt: new Date('2026-10-20T12:00:00Z'), items: [{ name: 'Idli', quantity: 8 }] },
    { createdAt: new Date('2026-10-19T12:00:00Z'), items: [{ name: 'Idli', quantity: 6 }, { name: 'Dosa', quantity: 4 }] },
    { createdAt: new Date('2026-09-01T12:00:00Z'), items: [{ name: 'Idli', quantity: 100 }] }
  ];
  const result = forecastOrders(orders, now);
  assert.deepEqual(result.find((dish) => dish.name === 'Idli'), {
    name: 'Idli', historical28Days: 14, dailyAverage: 0.5, nextDay: 1, nextSevenDays: 4,
    method: '28-day moving average', reliability: 'Preliminary'
  });
});
