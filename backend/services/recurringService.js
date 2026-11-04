import Recurring from '../models/Recurring.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';
import { addInterval, isoDay } from '../utils/dates.js';
import { formatMoney } from '../utils/money.js';

const MAX_PER_RULE = 366; // safety cap for a rule that was created far in the past

// Generates every occurrence of a rule that is due. Each occurrence is "claimed" with an
// atomic findOneAndUpdate on nextDate, so the background job and a user request running at
// the same moment can never create the same transaction twice.
export async function processRule(rule, now = new Date(), currency) {
  let current = rule.nextDate;
  let generated = 0;

  while (generated < MAX_PER_RULE && current <= now) {
    if (rule.endDate && current > rule.endDate) {
      await Recurring.updateOne({ _id: rule._id }, { isActive: false });
      break;
    }
    const next = addInterval(current, rule.frequency, rule.anchorDay);
    const claimed = await Recurring.findOneAndUpdate(
      { _id: rule._id, nextDate: current, isActive: true },
      { $set: { nextDate: next, lastGeneratedAt: now } }
    );
    if (!claimed) break; // someone else already handled it

    await Transaction.create({
      user: rule.user,
      title: rule.title,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      account: rule.account,
      description: rule.description || `Recurring ${rule.frequency} ${rule.type}`,
      date: current,
      recurringId: rule._id,
    });

    if (!currency) currency = (await User.findById(rule.user).select('currency').lean())?.currency;
    await createNotification(rule.user, {
      key: `recurring:${rule._id}:${isoDay(current)}`,
      type: 'recurring',
      title: `Recurring ${rule.type} added`,
      message: `${rule.title}: ${formatMoney(rule.amount, currency || 'INR')} on ${isoDay(current)}.`,
    });

    generated++;
    current = next;
  }
  return generated;
}

export async function processRecurringForUser(user) {
  const now = new Date();
  const rules = await Recurring.find({ user: user._id, isActive: true, nextDate: { $lte: now } }).lean();
  let total = 0;
  for (const rule of rules) total += await processRule(rule, now, user.currency);
  return total;
}

// Background job: every user's due rules
export async function processAllDue() {
  const now = new Date();
  const rules = await Recurring.find({ isActive: true, nextDate: { $lte: now } }).limit(1000).lean();
  let total = 0;
  for (const rule of rules) total += await processRule(rule, now);
  return total;
}