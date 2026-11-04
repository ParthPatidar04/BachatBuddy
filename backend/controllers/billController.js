import Bill from '../models/Bill.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { DAY, startOfDayUTC } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { refreshNotifications } from '../services/notificationService.js';

const decorate = (bill) => {
  const b = typeof bill.toObject === 'function' ? bill.toObject() : bill;
  const daysUntil = Math.round((new Date(b.dueDate) - startOfDayUTC()) / DAY);
  return { ...b, daysUntil, overdue: b.status === 'pending' && daysUntil < 0 };
};

export const listBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find({ user: req.user._id }).sort({ status: -1, dueDate: 1 }).lean(); // pending first
  const list = bills.map(decorate);
  const pending = list.filter((b) => b.status === 'pending');
  res.json({
    bills: list,
    summary: {
      pendingCount: pending.length,
      overdueCount: pending.filter((b) => b.overdue).length,
      pendingTotal: round2(pending.reduce((s, b) => s + b.amount, 0)),
    },
  });
});

export const createBill = asyncHandler(async (req, res) => {
  const bill = await Bill.create({
    ...req.body,
    account: req.body.account || req.user.accounts[0] || 'Cash',
    user: req.user._id,
  });
  await refreshNotifications(req.user);
  res.status(201).json({ bill: decorate(bill) });
});

export const updateBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'paid') throw new AppError('A paid bill can no longer be edited');
  bill.set(req.body);
  await bill.save();
  await refreshNotifications(req.user);
  res.json({ bill: decorate(bill) });
});

export const deleteBill = asyncHandler(async (req, res) => {
  const deleted = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw new AppError('Bill not found', 404);
  res.json({ message: 'Bill deleted' });
});

// Paying a bill records an expense so balances, budgets and analytics stay consistent
export const payBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'pending' },
    { status: 'paid', paidAt: new Date() }, // atomic: a double click can't create two expenses
    { new: true }
  );
  if (!bill) {
    const exists = await Bill.exists({ _id: req.params.id, user: req.user._id });
    throw new AppError(exists ? 'This bill is already paid' : 'Bill not found', exists ? 409 : 404);
  }
  try {
    const tx = await Transaction.create({
      user: req.user._id,
      title: bill.name,
      amount: bill.amount,
      type: 'expense',
      category: bill.category,
      account: bill.account,
      description: `Bill payment (due ${bill.dueDate.toISOString().slice(0, 10)})`,
      date: startOfDayUTC(),
      billId: bill._id,
    });
    bill.transaction = tx._id;
    await bill.save();
  } catch (err) {
    await Bill.updateOne({ _id: bill._id }, { status: 'pending', $unset: { paidAt: 1 } });
    throw err;
  }
  await refreshNotifications(req.user);
  res.json({ bill: decorate(bill) });
});