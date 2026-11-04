import PDFDocument from 'pdfkit';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import asyncHandler from '../utils/asyncHandler.js';
import { addDays, DAY, isoDay, monthRange } from '../utils/dates.js';
import { formatPlain } from '../utils/money.js';
import { totalsBetween, categoryTotals, monthlySeries, weeklyExpenses } from '../services/analyticsService.js';
import { getBudgetStatus } from '../services/budgetService.js';
import { serializeGoal } from '../services/goalService.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function buildReport(user, { period, year, month }) {
  const now = new Date();
  const y = year ?? now.getUTCFullYear();
  let from;
  let to;
  let label;
  let key = null;

  if (period === 'year') {
    from = new Date(Date.UTC(y, 0, 1));
    to = new Date(Date.UTC(y + 1, 0, 1));
    label = `Year ${y}`;
  } else {
    const m = month ?? now.getUTCMonth() + 1;
    key = `${y}-${String(m).padStart(2, '0')}`;
    ({ from, to } = monthRange(key));
    label = `${MONTH_NAMES[m - 1]} ${y}`;
  }

  const [totals, expenseByCategory, incomeByCategory, trend, budgets, goalDocs] = await Promise.all([
    totalsBetween(user._id, from, to),
    categoryTotals(user._id, from, to, 'expense'),
    categoryTotals(user._id, from, to, 'income'),
    period === 'year' ? monthlySeries(user._id, from, to) : weeklyExpenses(user._id, from, to),
    key ? getBudgetStatus(user._id, key) : Promise.resolve([]),
    Goal.find({ user: user._id }).sort({ createdAt: -1 }),
  ]);

  const goals = goalDocs.map((g) => serializeGoal(g));
  return {
    period,
    label,
    currency: user.currency,
    range: { from: isoDay(from), to: isoDay(new Date(to.getTime() - DAY)) },
    totals,
    expenseByCategory,
    incomeByCategory,
    trend: { kind: period === 'year' ? 'monthly' : 'weekly', rows: trend },
    budgets,
    goals,
    savings: {
      netSavings: totals.net,
      savingsRate: totals.savingsRate,
      heldInGoals: goals.reduce((s, g) => s + g.savedAmount, 0),
    },
  };
}

export const getReport = asyncHandler(async (req, res) => {
  res.json(await buildReport(req.user, req.query));
});

// ---------- CSV ----------
// Text cells starting with = + - @ are prefixed so spreadsheets never run them as formulas
const csvText = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportCsv = asyncHandler(async (req, res) => {
  const { from, to, type, category } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lt = addDays(to, 1);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${isoDay(new Date())}.csv"`);
  res.write('\uFEFF'); // BOM so Excel reads UTF-8 correctly
  res.write('Date,Title,Type,Category,Account,Amount,Description\n');

  for await (const t of Transaction.find(filter).sort({ date: -1, _id: -1 }).lean().cursor()) {
    res.write(
      [isoDay(t.date), csvText(t.title), t.type, csvText(t.category), csvText(t.account), t.amount.toFixed(2), csvText(t.description)].join(',') + '\n'
    );
  }
  res.end();
});

// ---------- PDF ----------
export const exportPdf = asyncHandler(async (req, res) => {
  const r = await buildReport(req.user, req.query);
  const money = (n) => formatPlain(n, r.currency);

  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Financial report - ${r.label}` } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="financial-report-${r.label.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const ensureSpace = (h = 40) => {
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };
  const heading = (text) => {
    ensureSpace(60);
    doc.moveDown(1).fillColor('#5b3fd9').font('Helvetica-Bold').fontSize(13).text(text, left);
    doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).strokeColor('#e3def9').stroke();
    doc.moveDown(0.6).fillColor('#1f1b33').font('Helvetica').fontSize(10);
  };
  const row = (cols, { bold = false } = {}) => {
    ensureSpace(18);
    const y = doc.y;
    const colW = width / cols.length;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    cols.forEach((c, i) => doc.text(String(c), left + i * colW, y, { width: colW - 8, align: i === 0 ? 'left' : 'right' }));
    doc.y = y + 16;
  };

  doc.fillColor('#1f1b33').font('Helvetica-Bold').fontSize(22).text('Financial Report', left);
  doc.font('Helvetica').fontSize(11).fillColor('#6b6784')
    .text(`${r.label}  |  ${r.range.from} to ${r.range.to}`)
    .text(`Prepared for ${req.user.name}  |  Generated ${isoDay(new Date())}`);

  heading('Summary');
  row(['Total income', money(r.totals.income)]);
  row(['Total expenses', money(r.totals.expense)]);
  row(['Net savings', money(r.totals.net)], { bold: true });
  row(['Savings rate', `${r.totals.savingsRate}%`]);
  row(['Transactions', r.totals.count]);

  heading('Expenses by category');
  if (!r.expenseByCategory.length) row(['No expenses in this period']);
  else {
    row(['Category', 'Amount', 'Share'], { bold: true });
    r.expenseByCategory.forEach((c) => row([c.category, money(c.total), `${c.percent}%`]));
  }

  heading('Income by category');
  if (!r.incomeByCategory.length) row(['No income in this period']);
  else {
    row(['Category', 'Amount', 'Share'], { bold: true });
    r.incomeByCategory.forEach((c) => row([c.category, money(c.total), `${c.percent}%`]));
  }

  if (r.trend.kind === 'monthly') {
    heading('Month by month');
    row(['Month', 'Income', 'Expenses', 'Net'], { bold: true });
    r.trend.rows.forEach((m) => row([m.month, money(m.income), money(m.expense), money(m.net)]));
  } else {
    heading('Weekly spending');
    row(['Week starting', 'Spent'], { bold: true });
    r.trend.rows.forEach((w) => row([w.week, money(w.total)]));
  }

  if (r.budgets.length) {
    heading('Budgets');
    row(['Category', 'Spent', 'Limit', 'Used'], { bold: true });
    r.budgets.forEach((b) => row([b.category === 'overall' ? 'Overall' : b.category, money(b.spent), money(b.limit), `${b.percent}%`]));
  }

  heading('Savings goals (current status)');
  if (!r.goals.length) row(['No savings goals yet']);
  else {
    row(['Goal', 'Saved', 'Target', 'Progress'], { bold: true });
    r.goals.forEach((g) => row([g.name, money(g.savedAmount), money(g.targetAmount), `${g.percent}%`]));
  }

  doc.end();
});