import { getFinancialSnapshot } from './snapshotService.js';
import { formatMoney } from '../utils/money.js';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

const SYSTEM_PROMPT = `You are the AI financial assistant inside a personal finance tracker app.

Rules:
- Answer ONLY from the FINANCIAL DATA below. Never invent transactions, amounts, categories, dates or statistics.
- If the data does not contain what is needed, say so plainly and tell the user what to add or where to look in the app.
- Quote figures exactly as given. Use the precomputed totals instead of adding up lists yourself.
- "thisMonth" is month-to-date. For a fair comparison use "lastMonthSameDays"; "lastMonth" is the full previous month. Say which one you are using.
- Point out unusual spending (see "anomalies") and give practical, specific budgeting suggestions based on the user's own top categories.
- Keep answers short: a few sentences or a short list. Use plain text, "- " bullets and **bold** only. No tables, no headings.
- You are not a licensed financial advisor; do not give investment advice.`;

// Only the fields the model needs, so the prompt stays small
const toPromptData = (s) => ({
  currency: s.currency,
  today: s.today,
  currentMonth: s.month,
  previousMonth: s.previousMonth,
  dayOfMonth: s.dayOfMonth,
  allTime: s.allTime,
  thisMonth: s.thisMonth,
  lastMonth: s.lastMonth,
  lastMonthSameDays: s.lastMonthSameDays,
  categoriesThisMonth: s.categoriesThisMonth.map(({ category, total, percent }) => ({ category, total, percent })),
  categoriesLastMonth: s.categoriesLastMonth.map(({ category, total, percent }) => ({ category, total, percent })),
  monthlyLast6: s.monthly,
  budgets: s.budgets.map(({ category, limit, spent, remaining, percent, status }) => ({ category, limit, spent, remaining, percent, status })),
  goals: s.goals.map((g) => ({
    name: g.name, target: g.targetAmount, saved: g.savedAmount, percent: g.percent,
    targetDate: g.targetDate?.toISOString?.().slice(0, 10), onTrack: g.onTrack,
  })),
  unusualSpending: s.anomalies,
  largestExpensesThisMonth: s.largestExpensesThisMonth.map((t) => ({ ...t, date: t.date.toISOString().slice(0, 10) })),
  recentTransactions: s.recentTransactions.map((t) => ({
    title: t.title, amount: t.amount, type: t.type, category: t.category, account: t.account, date: t.date.toISOString().slice(0, 10),
  })),
  upcomingPayments: s.upcoming.map((u) => ({ title: u.title, amount: u.amount, type: u.type, date: u.date.toISOString().slice(0, 10), overdue: u.overdue })),
});

async function askGemini(question, history, data) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const contents = history.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  while (contents.length && contents[0].role !== 'user') contents.shift(); // Gemini needs a user turn first
  contents.push({ role: 'user', parts: [{ text: question }] });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nFINANCIAL DATA (JSON):\n${JSON.stringify(data)}` }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
  if (!text) throw new Error('Gemini returned an empty answer');
  return text;
}

// Deterministic fallback used when no API key is configured (or Gemini is unreachable).
// It answers the common questions straight from the computed snapshot.
function localReply(question, s) {
  const q = question.toLowerCase();
  const fmt = (n) => formatMoney(n, s.currency);
  const noData = s.thisMonth.count === 0 && s.lastMonth.count === 0;
  if (noData) return "I can't see any transactions for this month or last month yet. Add a few and ask me again.";

  const words = new Map();
  [...EXPENSE_CATEGORIES, ...s.categoriesThisMonth.map((c) => c.category), ...s.categoriesLastMonth.map((c) => c.category)]
    .forEach((c) => words.set(c.toLowerCase().split(/[\s&]+/)[0], c));
  words.delete('other');
  const hit = [...words.entries()].find(([w]) => q.includes(w));
  const top = s.categoriesThisMonth.slice(0, 3);

  if (/reduce|cut|cheaper|lower|unnecessary|suggest|tips?|improve|overspend/.test(q)) {
    const lines = [];
    top.slice(0, 2).forEach((c) => lines.push(`- **${c.category}** is ${c.percent}% of your spending (${fmt(c.total)}). Setting a category budget here is the quickest win.`));
    s.anomalies.slice(0, 2).forEach((a) => lines.push(`- **${a.category}** is ${a.increasePct}% above your recent average (${fmt(a.current)} vs ${fmt(a.average)}). Check what changed.`));
    s.budgets.filter((b) => b.status !== 'ok').slice(0, 2).forEach((b) => lines.push(`- Your **${b.category === 'overall' ? 'overall' : b.category}** budget is at ${Math.round(b.percent)}%.`));
    return lines.length ? `Based on your data this month:\n${lines.join('\n')}` : "Your spending looks steady. Add category budgets to get sharper suggestions.";
  }
  if (hit) {
    const name = hit[1];
    const cur = s.categoriesThisMonth.find((c) => c.category === name)?.total ?? 0;
    const prev = s.categoriesLastMonth.find((c) => c.category === name)?.total ?? 0;
    return `You spent **${fmt(cur)}** on ${name} this month so far. Last month's full total was ${fmt(prev)}.`;
  }
  if (/sav(e|ed|ing)|left over|net/.test(q)) {
    const t = s.thisMonth;
    return `This month you earned ${fmt(t.income)} and spent ${fmt(t.expense)}, so you saved **${fmt(t.net)}**${t.income > 0 ? ` (a ${t.savingsRate}% savings rate)` : ''}. Money set aside in goals so far: ${fmt(s.allTime.savedInGoals)}.`;
  }
  if (/compar|previous|last month|vs\b|versus/.test(q)) {
    const ch = s.expenseChangePct;
    const dir = ch === null ? '' : ch > 0 ? `up ${ch}%` : `down ${Math.abs(ch)}%`;
    return [
      `- This month so far: ${fmt(s.thisMonth.expense)} spent, ${fmt(s.thisMonth.income)} earned.`,
      `- Same days last month: ${fmt(s.lastMonthSameDays.expense)} spent${dir ? ` (you are ${dir})` : ''}.`,
      `- Full last month: ${fmt(s.lastMonth.expense)} spent, ${fmt(s.lastMonth.income)} earned.`,
    ].join('\n');
  }
  if (/highest|most|top|where|biggest|largest|go(ne)?\b/.test(q)) {
    if (!top.length) return 'No expenses recorded this month yet.';
    const lines = top.map((c) => `- **${c.category}**: ${fmt(c.total)} (${c.percent}%)`);
    const big = s.largestExpensesThisMonth[0];
    return `Your top spending categories this month:\n${lines.join('\n')}${big ? `\nLargest single expense: ${big.title} (${fmt(big.amount)}).` : ''}`;
  }
  return `So far this month you earned ${fmt(s.thisMonth.income)} and spent ${fmt(s.thisMonth.expense)}. ${s.insights[0] || ''}\nAsk me about a category, a comparison with last month, your savings, or ways to cut spending.`;
}

export async function askAssistant(user, question, history = []) {
  const snapshot = await getFinancialSnapshot(user);
  if (process.env.GEMINI_API_KEY) {
    try {
      const reply = await askGemini(question, history, toPromptData(snapshot));
      return { reply, source: 'gemini' };
    } catch (err) {
      console.error('Assistant: Gemini failed, using built-in answers:', err.message);
    }
  }
  return { reply: localReply(question, snapshot), source: 'local' };
}