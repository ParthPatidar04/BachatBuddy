import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { round2, pct } from '../utils/money.js';
import { isoDay, monthsBetween, weeksBetween } from '../utils/dates.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const dateMatch = (userId, from, to) => {
  const match = { user: oid(userId) };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lt = to; // exclusive
  }
  return match;
};

export async function totalsBetween(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: dateMatch(userId, from, to) },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const income = round2(rows.find((r) => r._id === 'income')?.total ?? 0);
  const expense = round2(rows.find((r) => r._id === 'expense')?.total ?? 0);
  const net = round2(income - expense);
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? round2((net / income) * 100) : 0,
    count: rows.reduce((n, r) => n + r.count, 0),
  };
}

export async function categoryTotals(userId, from, to, type = 'expense') {
  const rows = await Transaction.aggregate([
    { $match: { ...dateMatch(userId, from, to), type } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return rows.map((r) => ({
    category: r._id,
    total: round2(r.total),
    count: r.count,
    percent: pct(r.total, sum),
  }));
}

// zero-filled so charts never have gaps
export async function monthlySeries(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: dateMatch(userId, from, to) },
    {
      $group: {
        _id: { m: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const map = {};
  rows.forEach((r) => {
    map[r._id.m] = map[r._id.m] || { income: 0, expense: 0 };
    map[r._id.m][r._id.type] = r.total;
  });
  return monthsBetween(from, to).map((m) => {
    const income = round2(map[m]?.income ?? 0);
    const expense = round2(map[m]?.expense ?? 0);
    return { month: m, income, expense, net: round2(income - expense) };
  });
}

export async function weeklyExpenses(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: { ...dateMatch(userId, from, to), type: 'expense' } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$date', unit: 'week', startOfWeek: 'monday' } },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const map = Object.fromEntries(rows.map((r) => [isoDay(r._id), r.total]));
  return weeksBetween(from, to).map((w) => ({ week: w, total: round2(map[w] ?? 0) }));
}