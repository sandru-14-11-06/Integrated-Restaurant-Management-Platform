export function forecastOrders(orders, now = new Date()) {
  const byDish = new Map();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 28);
  for (const order of orders) {
    if (new Date(order.createdAt) < windowStart) continue;
    for (const item of order.items || []) {
      const entry = byDish.get(item.name) || { name: item.name, historical: 0, activeDays: new Set() };
      entry.historical += item.quantity;
      entry.activeDays.add(new Date(order.createdAt).toISOString().slice(0, 10));
      byDish.set(item.name, entry);
    }
  }
  return [...byDish.values()].map(({ name, historical, activeDays }) => {
    const dailyAverage = historical / 28;
    return { name, historical28Days: historical, dailyAverage: Number(dailyAverage.toFixed(2)), nextDay: Math.max(0, Math.round(dailyAverage)), nextSevenDays: Math.max(0, Math.round(dailyAverage * 7)), method: '28-day moving average', reliability: activeDays.size >= 14 ? 'Moderate' : 'Preliminary' };
  }).sort((a, b) => b.nextSevenDays - a.nextSevenDays);
}
