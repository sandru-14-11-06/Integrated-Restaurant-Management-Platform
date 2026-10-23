import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from './models.js';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
  User.findById(payload.id).select('name email role active')
    .then((user) => {
      if (!user || !user.active) return res.status(401).json({ message: 'Account is unavailable' });
      req.user = user;
      next();
    })
    .catch(next);
}

export const allowRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You are not authorized to perform this action' });

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  next();
};

export const dishValidation = [
  body('name').trim().notEmpty().withMessage('Dish name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('foodType').optional().isIn(['Vegetarian', 'Non-Vegetarian']),
  body('preparationTime').optional().isInt({ min: 1, max: 300 })
];
