import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { authenticate, allowRoles, validate, dishValidation } from './middleware.js';
import { User, ROLES, MenuItem, Order, Ingredient, InventoryTransaction, WasteRecord, SurplusListing, Reservation, RestaurantTable } from './models.js';
import { forecastOrders } from './services/forecast.js';
import { calculateOrderTotals } from './services/pricing.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, '../uploads'),
    filename: (_req, file, cb) => {
      const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype];
      cb(null, `${randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? null : new Error('Only JPG, PNG, WEBP, or GIF images are accepted'))
});
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const roles = (...names) => allowRoles(...names);
const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const orderTransitions = {
  Pending: ['Confirmed', 'Cancelled'], Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready'], Ready: ['Out for Delivery', 'Completed'],
  'Out for Delivery': ['Completed'], Completed: [], Cancelled: []
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'IRMP API' }));

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
  validate
], wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !user.active || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ message: 'Email or password is incorrect' });
  }
  res.json({ token: tokenFor(user), user: publicUser(user) });
}));
app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/register', [
  body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }), validate
], wrap(async (req, res) => {
  if (await User.exists({ email: req.body.email })) return res.status(409).json({ message: 'Email is already registered' });
  const user = await User.create({ name: req.body.name, email: req.body.email, password: await bcrypt.hash(req.body.password, 12), role: 'customer' });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));
app.get('/api/profile', authenticate, wrap(async (req, res) => {
  const user = await User.findById(req.user._id).select('name email role phone address');
  res.json(user);
}));
app.patch('/api/profile', authenticate, wrap(async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    updates.name = req.body.name.trim();
  }
  for (const field of ['phone', 'address']) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] !== 'string' || req.body[field].length > 500) return res.status(400).json({ message: `Invalid ${field}` });
      updates[field] = req.body[field].trim();
    }
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('name email role phone address');
  res.json(user);
}));

app.get('/api/menu', wrap(async (req, res) => {
  const filter = { archived: false };
  if (req.query.available !== 'all') filter.available = true;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.foodType) filter.foodType = req.query.foodType;
  if (req.query.search) filter.$text = { $search: req.query.search };
  res.json(await MenuItem.find(filter).sort({ popular: -1, name: 1 }).limit(200));
}));
app.get('/api/menu/:id', wrap(async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, archived: false }).populate('recipe.ingredient', 'name unit');
  if (!item) return res.status(404).json({ message: 'Dish not found' });
  res.json(item);
}));
app.post('/api/menu/upload', authenticate, roles('admin'), (req, res, next) => upload.single('image')(req, res, (error) => error ? res.status(400).json({ message: error.message }) : next()), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a JPG, PNG, WEBP, or GIF image under 3 MB' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});
app.post('/api/menu', authenticate, roles('admin'), dishValidation, validate, wrap(async (req, res) => {
  const dish = await MenuItem.create(req.body);
  res.status(201).json(dish);
}));
app.put('/api/menu/:id', authenticate, roles('admin'), dishValidation, validate, wrap(async (req, res) => {
  const dish = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!dish) return res.status(404).json({ message: 'Dish not found' });
  res.json(dish);
}));
app.patch('/api/menu/:id/availability', authenticate, roles('admin'), wrap(async (req, res) => {
  if (typeof req.body.available !== 'boolean') return res.status(400).json({ message: 'Availability must be true or false' });
  const dish = await MenuItem.findByIdAndUpdate(req.params.id, { available: req.body.available }, { new: true });
  if (!dish) return res.status(404).json({ message: 'Dish not found' });
  res.json(dish);
}));
app.delete('/api/menu/:id', authenticate, roles('admin'), wrap(async (req, res) => {
  const dish = await MenuItem.findById(req.params.id);
  if (!dish) return res.status(404).json({ message: 'Dish not found' });
  const referenced = await Order.exists({ 'items.menuItem': dish._id });
  if (referenced) { dish.archived = true; dish.available = false; await dish.save(); }
  else await dish.deleteOne();
  res.json({ message: referenced ? 'Dish archived to preserve order history' : 'Dish deleted' });
}));

app.get('/api/orders', authenticate, wrap(async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'delivery') {
    filter.deliveryStaff = req.user._id;
    filter.status = { $in: ['Ready', 'Out for Delivery'] };
  }
  res.json(await Order.find(filter).populate('customer', 'name email').populate('deliveryStaff', 'name').sort({ createdAt: -1 }).limit(100));
}));
app.post('/api/orders', authenticate, roles('customer', 'cashier', 'admin'), wrap(async (req, res) => {
  const { items, orderType, address, tableNumber, instructions } = req.body;
  const discountPercent = req.body.discountPercent === undefined ? 0 : Number(req.body.discountPercent);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 20) return res.status(400).json({ message: 'Discount must be between 0 and 20 percent' });
  if (req.user.role === 'customer' && discountPercent > 0) return res.status(403).json({ message: 'Only authorized cashier staff may apply a discount' });
  const idempotencyKey = req.get('Idempotency-Key');
  if (idempotencyKey && (idempotencyKey.length > 128 || !/^[\w-]+$/.test(idempotencyKey))) return res.status(400).json({ message: 'Invalid idempotency key' });
  if (!Array.isArray(items) || !items.length || items.length > 30) return res.status(400).json({ message: 'Add between 1 and 30 dishes' });
  if (!['dine-in', 'takeaway', 'delivery'].includes(orderType)) return res.status(400).json({ message: 'Choose a valid order type' });
  if (orderType === 'delivery' && !String(address || '').trim()) return res.status(400).json({ message: 'Delivery address is required' });
  if (idempotencyKey) {
    const existing = await Order.findOne({ customer: req.user._id, idempotencyKey });
    if (existing) return res.json(existing);
  }
  const ids = [...new Set(items.map((i) => String(i.menuItem || '')))];
  if (ids.some((id) => !/^[0-9a-f]{24}$/i.test(id))) return res.status(400).json({ message: 'Invalid dish in order' });
  const dishes = await MenuItem.find({ _id: { $in: ids }, available: true, archived: false });
  if (dishes.length !== ids.length) return res.status(400).json({ message: 'One or more dishes are unavailable' });
  const byId = new Map(dishes.map((d) => [String(d._id), d]));
  const orderItems = [];
  for (const input of items) {
    const quantity = Number(input.quantity);
    const dish = byId.get(String(input.menuItem));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50 || !dish) return res.status(400).json({ message: 'Invalid dish quantity' });
    orderItems.push({ menuItem: dish._id, name: dish.name, unitPrice: dish.price, quantity, itemTotal: Math.round(dish.price * quantity * 100) / 100 });
  }
  const { subtotal, discount, tax, deliveryFee, total } = calculateOrderTotals(orderItems, orderType, discountPercent);
  let order;
  try {
    order = await Order.create({
      orderNumber: `IR${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      customer: req.user._id, items: orderItems, subtotal, discount, tax, deliveryFee, total,
      orderType, address, tableNumber, instructions, paymentMethod: 'DEMO', paymentStatus: 'pending',
      status: 'Pending', statusHistory: [{ status: 'Pending', by: req.user._id }]
    });
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ customer: req.user._id, idempotencyKey });
      if (existing) return res.json(existing);
    }
    throw error;
  }
  const io = req.app.get('io');
  io?.emit('orders:changed');
  res.status(201).json(order);
}));
app.patch('/api/orders/:id/status', authenticate, roles('admin', 'kitchen', 'cashier', 'delivery'), wrap(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const next = req.body.status;
  if (!orderTransitions[order.status]?.includes(next)) return res.status(400).json({ message: `Cannot change order from ${order.status} to ${next}` });
  if (order.inventoryProcessing) return res.status(409).json({ message: 'Inventory is being updated for this order; retry shortly' });
  if (req.user.role === 'delivery' && (order.orderType !== 'delivery' || String(order.deliveryStaff) !== String(req.user._id) || !['Out for Delivery', 'Completed'].includes(next))) {
    return res.status(403).json({ message: 'This delivery is not assigned or cannot be updated' });
  }
  if (req.user.role === 'kitchen' && !['Confirmed', 'Preparing', 'Ready'].includes(next)) return res.status(403).json({ message: 'Kitchen cannot set that status' });
  let processingLock = false;
  let changedIngredients = [];
  if (next === 'Confirmed') {
    const locked = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status, inventoryProcessing: false, inventoryDeducted: false },
      { $set: { inventoryProcessing: true } },
      { new: true }
    );
    if (!locked) return res.status(409).json({ message: 'This order is already being confirmed; refresh and retry' });
    processingLock = true;
    const recipes = await Promise.all(order.items.map(async (line) => {
      const dish = await MenuItem.findById(line.menuItem).populate('recipe.ingredient');
      return dish ? dish.recipe.map((r) => ({ ingredientId: r.ingredient?._id, amount: r.quantity * line.quantity, unit: r.ingredient?.unit })) : [];
    }));
    const deductions = recipes.flat().filter((entry) => entry.ingredientId);
    for (const entry of deductions) {
      const updated = await Ingredient.findOneAndUpdate({ _id: entry.ingredientId, stock: { $gte: entry.amount } }, { $inc: { stock: -entry.amount } }, { new: true });
      if (!updated) {
        for (const done of changedIngredients) await Ingredient.updateOne({ _id: done.ingredientId }, { $inc: { stock: done.amount } });
        await Order.updateOne({ _id: order._id, status: order.status, inventoryProcessing: true }, { $set: { inventoryProcessing: false } });
        return res.status(409).json({ message: 'Insufficient ingredient stock; order was not confirmed' });
      }
      changedIngredients.push(entry);
    }
    order.inventoryDeducted = deductions.length > 0;
    order.inventoryDeductions = changedIngredients.map((entry) => ({ ingredient: entry.ingredientId, quantity: entry.amount, unit: entry.unit }));
    if (changedIngredients.length) {
      try {
        await InventoryTransaction.insertMany(changedIngredients.map((entry) => ({
          ingredient: entry.ingredientId, quantity: -entry.amount, unit: entry.unit, type: 'consumption',
          order: order._id, performedBy: req.user._id, notes: `Consumed for order ${order.orderNumber}`
        })));
      } catch (error) {
        for (const entry of changedIngredients) await Ingredient.updateOne({ _id: entry.ingredientId }, { $inc: { stock: entry.amount } });
        await Order.updateOne({ _id: order._id, status: order.status, inventoryProcessing: true }, { $set: { inventoryProcessing: false } });
        throw error;
      }
    }
  }
  if (next === 'Cancelled' && order.inventoryDeducted) {
    const locked = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status, inventoryProcessing: false, inventoryDeducted: true },
      { $set: { inventoryProcessing: true } },
      { new: true }
    );
    if (!locked) return res.status(409).json({ message: 'This order is already being cancelled; refresh and retry' });
    processingLock = true;
    if (order.inventoryDeductions.length) {
      changedIngredients = order.inventoryDeductions.map((entry) => ({ ingredientId: entry.ingredient, amount: entry.quantity, unit: entry.unit }));
    } else {
      const recipes = await Promise.all(order.items.map(async (line) => {
        const dish = await MenuItem.findById(line.menuItem).populate('recipe.ingredient');
        return dish ? dish.recipe.map((r) => ({ ingredientId: r.ingredient?._id, amount: r.quantity * line.quantity, unit: r.ingredient?.unit })) : [];
      }));
      changedIngredients = recipes.flat().filter((r) => r.ingredientId);
    }
    for (const entry of changedIngredients) await Ingredient.updateOne({ _id: entry.ingredientId }, { $inc: { stock: entry.amount } });
    if (changedIngredients.length) {
      try {
        await InventoryTransaction.insertMany(changedIngredients.map((entry) => ({
          ingredient: entry.ingredientId, quantity: entry.amount, unit: entry.unit, type: 'restoration',
          order: order._id, performedBy: req.user._id, notes: `Restored for cancelled order ${order.orderNumber}`
        })));
      } catch (error) {
        for (const entry of changedIngredients) await Ingredient.updateOne({ _id: entry.ingredientId }, { $inc: { stock: -entry.amount } });
        await Order.updateOne({ _id: order._id, status: order.status, inventoryProcessing: true }, { $set: { inventoryProcessing: false } });
        throw error;
      }
    }
    order.inventoryDeducted = false;
    order.inventoryDeductions = [];
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status, inventoryProcessing: processingLock },
    { $set: { status: next, inventoryDeducted: order.inventoryDeducted, inventoryProcessing: false, inventoryDeductions: order.inventoryDeductions }, $push: { statusHistory: { status: next, by: req.user._id, at: new Date() } } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new Error('Order status changed during processing; verify inventory before retrying');
  req.app.get('io')?.emit('orders:changed');
  res.json(updated);
}));
app.patch('/api/orders/:id/assign-delivery', authenticate, roles('admin'), wrap(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.orderType !== 'delivery') return res.status(400).json({ message: 'Only delivery orders can be assigned' });
  const staff = await User.findOne({ _id: req.body.staffId, role: 'delivery', active: true });
  if (!staff) return res.status(400).json({ message: 'Choose an active delivery staff account' });
  order.deliveryStaff = staff._id;
  await order.save();
  req.app.get('io')?.emit('orders:changed');
  res.json(await order.populate('deliveryStaff', 'name'));
}));
app.patch('/api/orders/:id/payment', authenticate, roles('cashier', 'admin'), wrap(async (req, res) => {
  if (!['paid', 'pending'].includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Invalid payment status' });
  const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus: req.body.paymentStatus, paymentMethod: 'DEMO' }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}));

app.get('/api/ingredients', authenticate, roles('admin', 'inventory', 'kitchen'), wrap(async (_req, res) => res.json(await Ingredient.find().sort({ name: 1 }))));
app.get('/api/inventory/transactions', authenticate, roles('admin', 'inventory'), wrap(async (_req, res) => res.json(
  await InventoryTransaction.find().populate('ingredient', 'name unit').populate('performedBy', 'name').populate('order', 'orderNumber').sort({ createdAt: -1 }).limit(200)
)));
app.post('/api/ingredients', authenticate, roles('admin', 'inventory'), wrap(async (req, res) => {
  const { name, unit, stock, minimumStock, unitCost } = req.body;
  if (!name || !unit || !Number.isFinite(+stock) || +stock < 0 || +unitCost < 0) return res.status(400).json({ message: 'Provide valid ingredient details' });
  res.status(201).json(await Ingredient.create({ name, unit, stock: +stock, minimumStock: +minimumStock || 0, unitCost: +unitCost || 0 }));
}));
app.patch('/api/ingredients/:id/adjust', authenticate, roles('admin', 'inventory'), wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: 'Adjustment must be a non-zero number' });
  const ingredient = await Ingredient.findOneAndUpdate({ _id: req.params.id, stock: { $gte: amount < 0 ? -amount : 0 } }, { $inc: { stock: amount } }, { new: true });
  if (!ingredient) return res.status(400).json({ message: 'Ingredient not found or stock cannot become negative' });
  try {
    await InventoryTransaction.create({
      ingredient: ingredient._id, quantity: amount, unit: ingredient.unit,
      type: amount > 0 ? 'restock' : 'adjustment', performedBy: req.user._id,
      notes: String(req.body.notes || '')
    });
  } catch (error) {
    await Ingredient.updateOne({ _id: ingredient._id }, { $inc: { stock: -amount } });
    throw error;
  }
  res.json(ingredient);
}));

app.get('/api/waste', authenticate, roles('admin', 'inventory'), wrap(async (_req, res) => res.json(await WasteRecord.find().sort({ createdAt: -1 }).limit(200))));
app.post('/api/waste', authenticate, roles('admin', 'inventory'), wrap(async (req, res) => {
  const { item, quantity, unit, reason, cost, notes } = req.body;
  if (!item || !unit || !reason || +quantity <= 0 || +cost < 0) return res.status(400).json({ message: 'Complete all required waste details' });
  res.status(201).json(await WasteRecord.create({ item, quantity: +quantity, unit, reason, cost: +cost, notes, recordedBy: req.user._id }));
}));

app.get('/api/surplus', authenticate, wrap(async (_req, res) => {
  await SurplusListing.updateMany({ status: 'Available', pickupDeadline: { $lt: new Date() } }, { $set: { status: 'Expired', remaining: 0 } });
  res.json(await SurplusListing.find().sort({ createdAt: -1 }).limit(100));
}));
app.post('/api/surplus', authenticate, roles('admin'), wrap(async (req, res) => {
  const { dish, quantity, originalPrice, discountedPrice, listingType, pickupDeadline, pickupWindow, handlingInfo } = req.body;
  if (!dish || +quantity < 1 || !pickupDeadline || new Date(pickupDeadline) <= new Date()) return res.status(400).json({ message: 'Provide a valid dish, quantity and future pickup deadline' });
  if (+discountedPrice > +originalPrice || +discountedPrice < 0) return res.status(400).json({ message: 'Discounted price must be between zero and the original price' });
  const listing = await SurplusListing.create({ dish, quantity: +quantity, remaining: +quantity, originalPrice: +originalPrice || 0, discountedPrice: +discountedPrice || 0, listingType, pickupDeadline, pickupWindow, handlingInfo });
  res.status(201).json(listing);
}));
app.post('/api/surplus/:id/claim', authenticate, roles('customer', 'food-rescue'), wrap(async (req, res) => {
  const qty = Number(req.body.quantity || 1);
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: 'Quantity must be a positive whole number' });
  const listing = await SurplusListing.findOneAndUpdate(
    { _id: req.params.id, status: 'Available', pickupDeadline: { $gt: new Date() }, remaining: { $gte: qty } },
    { $inc: { remaining: -qty }, $push: { claims: { partner: req.user._id, quantity: qty, status: 'Claimed' } } },
    { new: true }
  );
  if (!listing) return res.status(409).json({ message: 'Listing has expired or does not have that quantity available' });
  if (listing.remaining === 0) { listing.status = 'Claimed'; await listing.save(); }
  res.json(listing);
}));
app.patch('/api/surplus/:id/collect', authenticate, roles('admin', 'food-rescue'), wrap(async (req, res) => {
  const listing = await SurplusListing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  const claim = listing.claims.id(req.body.claimId);
  if (!claim || (req.user.role === 'food-rescue' && String(claim.partner) !== String(req.user._id))) return res.status(403).json({ message: 'Claim not found or not yours' });
  claim.status = 'Collected';
  if (listing.remaining === 0 && listing.claims.every((c) => c.status === 'Collected')) listing.status = 'Collected';
  await listing.save();
  res.json(listing);
}));

app.get('/api/reservations', authenticate, wrap(async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : {};
  res.json(await Reservation.find(filter).populate('table', 'number capacity').sort({ date: 1 }).limit(100));
}));
app.post('/api/reservations', authenticate, wrap(async (req, res) => {
  const { name, phone, date, timeSlot, partySize } = req.body;
  if (!name || !date || !/^(12:00|13:00|18:00|19:00|20:00|21:00)$/.test(timeSlot || '') || !Number.isInteger(+partySize) || +partySize < 1) return res.status(400).json({ message: 'Enter a valid future reservation and party size' });
  const reservationDate = new Date(date);
  if (Number.isNaN(reservationDate.getTime())) return res.status(400).json({ message: 'Enter a valid reservation date' });
  const [hours, minutes] = timeSlot.split(':').map(Number);
  reservationDate.setHours(hours, minutes, 0, 0);
  if (reservationDate < new Date(Date.now() - 60000)) return res.status(400).json({ message: 'Enter a valid future reservation and party size' });
  const tables = await RestaurantTable.find({ active: true, capacity: { $gte: +partySize } }).sort({ capacity: 1, number: 1 });
  let table = null;
  for (const candidate of tables) {
    const conflict = await Reservation.exists({ table: candidate._id, activeSlot: true, date: reservationDate, timeSlot });
    if (!conflict) { table = candidate; break; }
  }
  if (!table) return res.status(409).json({ message: 'No table is available in this time slot' });
  res.status(201).json(await Reservation.create({ customer: req.user._id, name, phone, date: reservationDate, timeSlot, partySize: +partySize, table: table._id }));
}));
app.patch('/api/reservations/:id/status', authenticate, roles('admin', 'cashier', 'customer'), wrap(async (req, res) => {
  if (!['Seated', 'Completed', 'Cancelled'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid reservation status' });
  if (req.user.role === 'customer' && req.body.status !== 'Cancelled') return res.status(403).json({ message: 'Customers may only cancel their own reservation' });
  const filter = req.user.role === 'customer' ? { _id: req.params.id, customer: req.user._id } : { _id: req.params.id };
  const reservation = await Reservation.findOneAndUpdate(filter, { status: req.body.status, ...(['Cancelled', 'Completed'].includes(req.body.status) ? { activeSlot: false } : {}) }, { new: true });
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
  res.json(reservation);
}));
app.get('/api/tables', authenticate, roles('admin', 'cashier'), wrap(async (_req, res) => res.json(await RestaurantTable.find().sort({ number: 1 }))));

app.get('/api/forecast', authenticate, roles('admin', 'inventory'), wrap(async (_req, res) => {
  const orders = await Order.find({ status: { $nin: ['Cancelled'] } }).select('items createdAt');
  res.json(forecastOrders(orders));
}));
app.get('/api/analytics', authenticate, roles('admin', 'cashier'), wrap(async (_req, res) => {
  const [orders, menuCount, lowStock, waste, popular] = await Promise.all([
    Order.find(), MenuItem.countDocuments({ archived: false }), Ingredient.countDocuments({ $expr: { $lte: ['$stock', '$minimumStock'] } }),
    WasteRecord.find().select('cost'), Order.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' } } }, { $sort: { quantity: -1 } }, { $limit: 5 }])
  ]);
  const completed = orders.filter((o) => o.status === 'Completed');
  const wasteCost = waste.reduce((sum, record) => sum + record.cost, 0);
  res.json({
    sales: completed.reduce((sum, order) => sum + order.total, 0), totalOrders: orders.length,
    pendingOrders: orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status)).length,
    completedOrders: completed.length, menuCount, lowStock, wasteCost,
    averageOrderValue: completed.length ? completed.reduce((sum, o) => sum + o.total, 0) / completed.length : 0,
    popular, recentOrders: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  });
}));
app.get('/api/users', authenticate, roles('admin'), wrap(async (_req, res) => res.json(await User.find().select('name email role active createdAt').sort({ createdAt: -1 }))));
app.post('/api/users', authenticate, roles('admin'), wrap(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || !password || password.length < 8 || !ROLES.includes(role)) return res.status(400).json({ message: 'Provide valid name, email, password (8+ chars), and role' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role });
  res.status(201).json(publicUser(user));
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'A record with that value already exists' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid record identifier' });
  res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});
export default app;
