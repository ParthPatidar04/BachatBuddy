import { z } from 'zod';
import { FREQUENCIES } from '../utils/constants.js';
import { round2 } from '../utils/money.js';

const str = (max, min = 1) => z.string().trim().min(min).max(max);
const date = z.coerce.date();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const monthStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const typeEnum = z.enum(['income', 'expense']);

export const money = z.coerce
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000_000, 'Amount is too large')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most 2 decimal places')
  .transform(round2);

export const idParams = z.object({ id: objectId });

// ---------- auth ----------
export const registerBody = z.object({
  name: str(60, 2),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  currency: str(3, 3).toUpperCase().optional(),
});
export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(72),
});
export const profileBody = z.object({
  name: str(60, 2).optional(),
  currency: str(3, 3).toUpperCase().optional(),
  accounts: z.array(str(40)).min(1, 'Keep at least one account').max(10).optional(),
});
export const passwordBody = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72),
});

// ---------- transactions ----------
export const transactionBody = z.object({
  title: str(100),
  amount: money,
  type: typeEnum,
  category: str(40),
  date,
  description: z.string().trim().max(500).optional().default(''),
  account: str(40).optional(),
});
export const transactionUpdateBody = transactionBody.partial();
export const transactionQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  type: typeEnum.optional(),
  category: str(40).optional(),
  account: str(40).optional(),
  from: date.optional(),
  to: date.optional(),
  sortBy: z.enum(['date', 'amount']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ---------- budgets ----------
export const budgetQuery = z.object({ month: monthStr.optional() });
export const budgetBody = z.object({ month: monthStr, category: str(40), limit: money });
export const budgetCopyBody = z.object({ month: monthStr });

// ---------- goals ----------
export const goalBody = z.object({ name: str(80), targetAmount: money, targetDate: date });
export const goalUpdateBody = goalBody.partial();
export const contributeBody = z.object({ amount: money });

// ---------- recurring ----------
export const recurringBody = z.object({
  title: str(100),
  amount: money,
  type: typeEnum,
  category: str(40),
  account: str(40).optional(),
  description: z.string().trim().max(500).optional().default(''),
  frequency: z.enum(FREQUENCIES),
  startDate: date,
  endDate: date.nullable().optional(),
});
export const recurringUpdateBody = z.object({
  title: str(100).optional(),
  amount: money.optional(),
  type: typeEnum.optional(),
  category: str(40).optional(),
  account: str(40).optional(),
  description: z.string().trim().max(500).optional(),
  frequency: z.enum(FREQUENCIES).optional(),
  nextDate: date.optional(),
  endDate: date.nullable().optional(),
  isActive: z.boolean().optional(),
});

// ---------- bills ----------
export const billBody = z.object({
  name: str(100),
  amount: money,
  dueDate: date,
  category: str(40).optional(),
  account: str(40).optional(),
  reminderDays: z.coerce.number().int().min(0).max(30).default(3),
});
export const billUpdateBody = billBody.partial();

// ---------- analytics / reports ----------
export const rangeQuery = z.object({ from: date.optional(), to: date.optional() });
export const reportQuery = z.object({
  period: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
export const exportQuery = z.object({
  from: date.optional(),
  to: date.optional(),
  type: typeEnum.optional(),
  category: str(40).optional(),
});

// ---------- assistant ----------
export const chatBody = z.object({
  message: str(1000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .default([]),
});