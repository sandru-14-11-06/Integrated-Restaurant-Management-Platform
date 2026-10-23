export const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(Number(amount) || 0);

export const roleNames = {
  admin: 'Administrator', customer: 'Customer', kitchen: 'Kitchen Staff', inventory: 'Inventory Manager',
  cashier: 'Cashier', delivery: 'Delivery Staff', 'food-rescue': 'Food Rescue Partner'
};

export const roleHomes = {
  admin: '/admin/dashboard', customer: '/customer/dashboard', kitchen: '/kitchen/dashboard',
  inventory: '/inventory/dashboard', cashier: '/cashier/dashboard', delivery: '/delivery/dashboard',
  'food-rescue': '/food-rescue/dashboard'
};

export const fallbackImage = '/images/food-fallback.svg';
export const resolveImage = (image) => !image ? fallbackImage
  : image.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${image}`
    : image;
