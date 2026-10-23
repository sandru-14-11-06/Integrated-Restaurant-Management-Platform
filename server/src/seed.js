import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/db.js';
import { User, MenuItem, Ingredient, RestaurantTable } from './models.js';

const dishes = [
  ['Idli',40,'South Indian','Vegetarian'],['Plain Dosa',60,'South Indian','Vegetarian'],['Masala Dosa',90,'South Indian','Vegetarian'],['Pongal',60,'South Indian','Vegetarian'],['Medu Vada',40,'South Indian','Vegetarian'],['Onion Uttapam',80,'South Indian','Vegetarian'],
  ['Paneer Butter Masala',180,'North Indian','Vegetarian'],['Chole Bhature',120,'North Indian','Vegetarian'],['Dal Tadka',140,'North Indian','Vegetarian'],['Palak Paneer',170,'North Indian','Vegetarian'],['Butter Naan',40,'Indian Breads','Vegetarian'],['Roti',20,'Indian Breads','Vegetarian'],
  ['Chicken Biryani',180,'Biryani and Rice','Non-Vegetarian'],['Vegetable Biryani',130,'Biryani and Rice','Vegetarian'],['Mutton Biryani',250,'Biryani and Rice','Non-Vegetarian'],['Lemon Rice',80,'Biryani and Rice','Vegetarian'],['Curd Rice',70,'Biryani and Rice','Vegetarian'],['Vegetable Fried Rice',120,'Biryani and Rice','Vegetarian'],
  ['South Indian Meals',150,'Indian Meals and Thali','Vegetarian'],['North Indian Thali',180,'Indian Meals and Thali','Vegetarian'],['Samosa',30,'Indian Snacks and Starters','Vegetarian'],['Pav Bhaji',100,'Indian Street Food','Vegetarian'],['Pani Puri',50,'Indian Street Food','Vegetarian'],['Paneer Roll',100,'Indian Snacks and Starters','Vegetarian'],['Chicken 65',160,'Indian Snacks and Starters','Non-Vegetarian'],['Gobi Manchurian',120,'Indian Snacks and Starters','Vegetarian'],
  ['Gulab Jamun',50,'Indian Desserts and Sweets','Vegetarian'],['Rasmalai',80,'Indian Desserts and Sweets','Vegetarian'],['Payasam',60,'Indian Desserts and Sweets','Vegetarian'],['Filter Coffee',30,'Indian Beverages','Vegetarian'],['Masala Chai',25,'Indian Beverages','Vegetarian'],['Fresh Lime Juice',50,'Indian Beverages','Vegetarian']
];
const ingredients = [
  ['Rice batter','kg',45,10,60],['Potato','kg',30,8,35],['Paneer','kg',12,3,320],['Rice','kg',50,10,75],['Chicken','kg',18,5,260],['Onion','kg',40,10,35],['Wheat flour','kg',30,8,42],['Cooking oil','L',20,5,140],['Tomato','kg',25,8,40],['Milk','L',20,5,60],['Lentils','kg',20,5,130],['Spices','kg',8,2,480]
];
const foodImages = {
  'South Indian': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80',
  'North Indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
  'Biryani and Rice': 'https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=900&q=80',
  'Indian Meals and Thali': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'Indian Snacks and Starters': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  'Indian Street Food': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80',
  'Indian Breads': 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=900&q=80',
  'Indian Desserts and Sweets': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
  'Indian Beverages': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80'
};

try {
  await connectDatabase();
  const password = process.env.DEMO_PASSWORD || 'Restaurant123!';
  const accounts = [
    ['Admin','admin@irmp.demo','admin'],['Customer','customer@irmp.demo','customer'],['Kitchen Staff','kitchen@irmp.demo','kitchen'],
    ['Inventory Manager','inventory@irmp.demo','inventory'],['Cashier','cashier@irmp.demo','cashier'],
    ['Delivery Staff','delivery@irmp.demo','delivery'],['Food Rescue Partner','rescue@irmp.demo','food-rescue']
  ];
  for (const [name, email, role] of accounts) await User.updateOne({ email }, { $setOnInsert: { name, email, role, password: await bcrypt.hash(password, 12) } }, { upsert: true });
  for (const [name, price, category, foodType] of dishes) await MenuItem.updateOne({ name }, { $setOnInsert: {
    name, price, category, foodType, description: `${name}, freshly prepared with traditional Indian flavours.`, ingredients: [category === 'South Indian' ? 'Rice batter' : 'Indian spices'], allergens: foodType === 'Vegetarian' ? ['May contain dairy'] : [], preparationTime: 15, image: foodImages[category] || foodImages['Indian Snacks and Starters'], available: true, popular: ['Masala Dosa','Paneer Butter Masala','Chicken Biryani','South Indian Meals'].includes(name)
  } }, { upsert: true });
  for (const [name, , category] of dishes) await MenuItem.updateOne({ name, image: '' }, { $set: { image: foodImages[category] || foodImages['Indian Snacks and Starters'] } });
  for (const [name, unit, stock, minimumStock, unitCost] of ingredients) await Ingredient.updateOne({ name }, { $setOnInsert: { name, unit, stock, minimumStock, unitCost } }, { upsert: true });
  const pantry = Object.fromEntries((await Ingredient.find()).map((item) => [item.name, item._id]));
  const recipes = {
    'Idli': [['Rice batter', 0.18]], 'Plain Dosa': [['Rice batter', 0.2], ['Cooking oil', 0.01]],
    'Masala Dosa': [['Rice batter', 0.22], ['Potato', 0.12], ['Onion', 0.04], ['Cooking oil', 0.01]],
    'Paneer Butter Masala': [['Paneer', 0.18], ['Tomato', 0.12], ['Milk', 0.05], ['Spices', 0.01]],
    'Dal Tadka': [['Lentils', 0.12], ['Onion', 0.04], ['Tomato', 0.05], ['Spices', 0.01]],
    'Chicken Biryani': [['Rice', 0.18], ['Chicken', 0.16], ['Onion', 0.05], ['Spices', 0.01]],
    'Vegetable Biryani': [['Rice', 0.18], ['Potato', 0.06], ['Onion', 0.04], ['Spices', 0.01]],
    'Roti': [['Wheat flour', 0.08]], 'Gulab Jamun': [['Milk', 0.08]]
  };
  for (const [dishName, rows] of Object.entries(recipes)) await MenuItem.updateOne({ name: dishName }, { $set: { recipe: rows.map(([ingredient, quantity]) => ({ ingredient: pantry[ingredient], quantity })) } });
  for (let i = 1; i <= 12; i++) await RestaurantTable.updateOne({ number: `T${i}` }, { $setOnInsert: { number: `T${i}`, capacity: i % 3 === 0 ? 6 : 4 } }, { upsert: true });
  console.log(`Seed complete: ${accounts.length} demo roles, ${dishes.length} dishes, ${ingredients.length} ingredients, 12 tables.`);
  console.log(`Demo password: ${password} (development only)`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
