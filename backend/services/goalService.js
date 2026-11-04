import { DAY, startOfDayUTC } from '../utils/dates.js';
import { round2, pct } from '../utils/money.js';

// Adds derived fields. The estimate is based on the user's real saving pace:
// saved amount / days since the first contribution (or since the goal was created).
export function serializeGoal(goal, now = new Date()) {
  const g = typeof goal.toObject === 'function' ? goal.toObject() : goal;
  const remaining = round2(Math.max(0, g.targetAmount - g.savedAmount));
  const percent = Math.min(100, pct(g.savedAmount, g.targetAmount));
  const completed = g.savedAmount >= g.targetAmount;
  const today = startOfDayUTC(now);
  const daysLeft = Math.ceil((new Date(g.targetDate) - today) / DAY);

  let estimatedCompletion = null;
  if (!completed && g.savedAmount > 0) {
    const start = new Date(g.contributions?.[0]?.date ?? g.createdAt);
    const days = Math.max(1, (now - start) / DAY);
    const perDay = g.savedAmount / days;
    if (perDay > 0) estimatedCompletion = new Date(now.getTime() + (remaining / perDay) * DAY);
  }

  const monthsLeft = Math.max(1, daysLeft / 30.44);
  return {
    ...g,
    remaining,
    percent,
    completed,
    daysLeft,
    overdue: !completed && daysLeft < 0,
    estimatedCompletion,
    onTrack: completed || (estimatedCompletion ? estimatedCompletion <= new Date(g.targetDate) : null),
    requiredPerMonth: completed ? 0 : round2(remaining / monthsLeft),
  };
}