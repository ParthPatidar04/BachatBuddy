import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { addDays } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { refreshNotifications } from '../services/notificationService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, search, type, category, account, from, to, sortBy, order } = req.query;

  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (account) filter.account = account;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lt = addDays(to, 1); // "to" is inclusive for the user
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const dir = order === 'asc' ? 1 : -1;
  const [transactions, total, sums] = await Promise.all([
    Transaction.find(filter)
      .sort({ [sortBy]: dir, _id: dir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);

  const income = round2(sums.find((s) => s._id === 'income')?.total ?? 0);
  const expense = round2(sums.find((s) => s._id === 'expense')?.total ?? 0);

  res.json({
    transactions,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    totals: { income, expense, net: round2(income - expense) }, // for the filtered result set
  });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const account = req.body.account || req.user.accounts[0] || 'Cash';
  const transaction = await Transaction.create({ ...req.body, account, user: req.user._id });
  await refreshNotifications(req.user);
  res.status(201).json({ transaction });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) throw new AppError('Transaction not found', 404);
  transaction.set(req.body);
  await transaction.save();
  await refreshNotifications(req.user);
  res.json({ transaction });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw new AppError('Transaction not found', 404);
  res.json({ message: 'Transaction deleted' });
});