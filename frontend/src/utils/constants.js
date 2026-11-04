import {
  Banknote, Car, Film, Gift, GraduationCap, HeartPulse, House, Laptop, Plane, CirclePlus, Receipt,
  Repeat, ShoppingBag, ShoppingBasket, Tag, Target, TrendingUp, Utensils,
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Shopping', 'Bills & Utilities', 'Rent',
  'Entertainment', 'Health', 'Education', 'Travel', 'Subscriptions', 'Other',
];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other Income'];
export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'JPY', 'SGD'];
export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const CATEGORY_ICONS = {
  'Food & Dining': Utensils,
  Groceries: ShoppingBasket,
  Transport: Car,
  Shopping: ShoppingBag,
  'Bills & Utilities': Receipt,
  Rent: House,
  Entertainment: Film,
  Health: HeartPulse,
  Education: GraduationCap,
  Travel: Plane,
  Subscriptions: Repeat,
  Other: Tag,
  Salary: Banknote,
  Freelance: Laptop,
  Investments: TrendingUp,
  Gift,
  'Other Income': CirclePlus,
  overall: Target,
};
export const categoryIcon = (c) => CATEGORY_ICONS[c] || Tag;