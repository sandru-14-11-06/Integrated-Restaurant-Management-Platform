import mongoose from 'mongoose';

const { Schema, model } = mongoose;
export const ROLES = ['admin', 'customer', 'kitchen', 'inventory', 'cashier', 'delivery', 'food-rescue'];

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const menuItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  foodType: { type: String, enum: ['Vegetarian', 'Non-Vegetarian'], default: 'Vegetarian' },
  ingredients: [{ type: String }],
  allergens: [{ type: String }],
  preparationTime: { type: Number, default: 15, min: 1 },
  available: { type: Boolean, default: true },
  recipe: [{ ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient' }, quantity: { type: Number, min: 0 } }],
  spiceLevel: { type: String, enum: ['Mild', 'Medium', 'Hot'], default: 'Medium' },
  dietaryTags: [{ type: String }],
  popular: { type: Boolean, default: false },
  archived: { type: Boolean, default: false }
}, { timestamps: true });
menuItemSchema.index({ name: 'text', description: 'text', category: 'text' });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, select: false },
  customer: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [{
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    itemTotal: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  orderType: { type: String, enum: ['dine-in', 'takeaway', 'delivery'], required: true },
  address: { type: String, default: '' },
  tableNumber: { type: String, default: '' },
  deliveryStaff: { type: Schema.Types.ObjectId, ref: 'User' },
  instructions: { type: String, default: '' },
  paymentMethod: { type: String, default: 'demo' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled'], default: 'Pending' },
  inventoryDeducted: { type: Boolean, default: false },
  inventoryProcessing: { type: Boolean, default: false },
  inventoryDeductions: [{ ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient' }, quantity: { type: Number, min: 0 }, unit: String }],
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: 'User' } }]
}, { timestamps: true });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ customer: 1, idempotencyKey: 1 }, {
  unique: true,
  partialFilterExpression: { idempotencyKey: { $type: 'string' } }
});

const ingredientSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  unit: { type: String, required: true, default: 'kg' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  minimumStock: { type: Number, min: 0, default: 5 },
  unitCost: { type: Number, min: 0, default: 0 },
  expiryDate: Date,
  supplier: { type: String, default: '' }
}, { timestamps: true });

const inventoryTransactionSchema = new Schema({
  ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  type: { type: String, enum: ['restock', 'adjustment', 'consumption', 'restoration'], required: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order' },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' }
}, { timestamps: true });

const wasteSchema = new Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true },
  reason: { type: String, required: true },
  cost: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const surplusSchema = new Schema({
  dish: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  remaining: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0, default: 0 },
  discountedPrice: { type: Number, min: 0, default: 0 },
  listingType: { type: String, enum: ['discount', 'donation'], default: 'donation' },
  pickupDeadline: { type: Date, required: true },
  pickupWindow: { type: String, default: '' },
  handlingInfo: { type: String, default: '' },
  status: { type: String, enum: ['Available', 'Claimed', 'Collected', 'Expired'], default: 'Available' },
  claims: [{ partner: { type: Schema.Types.ObjectId, ref: 'User' }, quantity: Number, status: { type: String, default: 'Claimed' }, claimedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

const reservationSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  partySize: { type: Number, required: true, min: 1 },
  table: { type: Schema.Types.ObjectId, ref: 'RestaurantTable' },
  status: { type: String, enum: ['Booked', 'Seated', 'Completed', 'Cancelled'], default: 'Booked' },
  activeSlot: { type: Boolean, default: true }
}, { timestamps: true });
reservationSchema.index({ table: 1, date: 1, timeSlot: 1 }, { unique: true, partialFilterExpression: { activeSlot: true } });

const tableSchema = new Schema({
  number: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true, min: 1 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const User = model('User', userSchema);
export const MenuItem = model('MenuItem', menuItemSchema);
export const Order = model('Order', orderSchema);
export const Ingredient = model('Ingredient', ingredientSchema);
export const InventoryTransaction = model('InventoryTransaction', inventoryTransactionSchema);
export const WasteRecord = model('WasteRecord', wasteSchema);
export const SurplusListing = model('SurplusListing', surplusSchema);
export const Reservation = model('Reservation', reservationSchema);
export const RestaurantTable = model('RestaurantTable', tableSchema, 'irmp_restaurant_tables');
