import Notification from '../models/Notification.js';
import Bill from '../models/Bill.js';
import Goal from '../models/Goal.js';
import { getBudgetStatus } from './budgetService.js';
import { addDays, DAY, isoDay, monthKey, startOfDayUTC } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';
import { OVERALL } from '../utils/constants.js';

// Upsert on (user, key): the same event can be raised any number of times, stored once.
export async function createNotification(userId, { key, type, title, message }) {
  await Notification.updateOne(
    { user: userId, key },
    { $setOnInsert: { type, title, message, read: false } },
    { upsert: true }
  );
}

const MILESTONES = [100, 75, 50, 25];

// Evaluates budgets, bills and goals and raises any notification that is due.
// Safe to call often; never throws (notifications must not break the main request).
export async function refreshNotifications(user) {
  try {
    const fmt = (n) => formatMoney(n, user.currency);
    const now = new Date();
    const today = startOfDayUTC(now);
    const month = monthKey(now);

    // budgets
    const budgets = await getBudgetStatus(user._id, month);
    for (const b of budgets) {
      if (b.status === 'ok') continue;
      const label = b.category === OVERALL ? 'Overall monthly budget' : `${b.category} budget`;
      const exceeded = b.status === 'exceeded';
      await createNotification(user._id, {
        key: `budget-${b.status}:${month}:${b.category}:${b.limit}`,
        type: exceeded ? 'budget_exceeded' : 'budget_warning',
        title: exceeded ? `${label} exceeded` : `${label} almost used up`,
        message: `You have spent ${fmt(b.spent)} of ${fmt(b.limit)} (${Math.round(b.percent)}%) this month.`,
      });
    }

    // bills
    const bills = await Bill.find({
      user: user._id,
      status: 'pending',
      dueDate: { $lte: addDays(today, 30) },
    }).lean();
    for (const bill of bills) {
      const daysUntil = Math.round((bill.dueDate - today) / DAY);
      if (daysUntil < 0) {
        await createNotification(user._id, {
          key: `bill-overdue:${bill._id}:${isoDay(bill.dueDate)}`,
          type: 'bill_overdue',
          title: `${bill.name} is overdue`,
          message: `${fmt(bill.amount)} was due ${Math.abs(daysUntil)} day(s) ago.`,
        });
      } else if (daysUntil <= bill.reminderDays) {
        await createNotification(user._id, {
          key: `bill-due:${bill._id}:${isoDay(bill.dueDate)}`,
          type: 'bill_due',
          title: daysUntil === 0 ? `${bill.name} is due today` : `${bill.name} due in ${daysUntil} day(s)`,
          message: `${fmt(bill.amount)} is due on ${isoDay(bill.dueDate)}.`,
        });
      }
    }

    // savings goal milestones (only the highest milestone reached, once each)
    const goals = await Goal.find({ user: user._id, savedAmount: { $gt: 0 } }).lean();
    for (const g of goals) {
      const percent = (g.savedAmount / g.targetAmount) * 100;
      const milestone = MILESTONES.find((m) => percent >= m);
      if (!milestone) continue;
      await createNotification(user._id, {
        key: `goal:${g._id}:${milestone}`,
        type: 'goal_milestone',
        title: milestone === 100 ? `Goal reached: ${g.name}` : `${milestone}% of ${g.name} saved`,
        message:
          milestone === 100
            ? `You saved the full ${fmt(g.targetAmount)}. Congratulations!`
            : `${fmt(g.savedAmount)} saved out of ${fmt(g.targetAmount)}.`,
      });
    }
  } catch (err) {
    console.error('refreshNotifications failed:', err.message);
  }
}