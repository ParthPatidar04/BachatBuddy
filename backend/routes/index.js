import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as tx from '../controllers/transactionController.js';
import * as budget from '../controllers/budgetController.js';
import * as goal from '../controllers/goalController.js';
import * as recurring from '../controllers/recurringController.js';
import * as bill from '../controllers/billController.js';
import * as analytics from '../controllers/analyticsController.js';
import * as notif from '../controllers/notificationController.js';
import * as assistant from '../controllers/assistantController.js';
import * as report from '../controllers/reportController.js';
import { CURRENCIES, DEFAULT_ACCOUNTS, EXPENSE_CATEGORIES, FREQUENCIES, INCOME_CATEGORIES } from '../utils/constants.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'You are asking too fast. Give it a minute.' },
});

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.get('/meta', (_req, res) =>
  res.json({
    expenseCategories: EXPENSE_CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
    currencies: CURRENCIES,
    defaultAccounts: DEFAULT_ACCOUNTS,
    frequencies: FREQUENCIES,
  })
);

// ---------- public auth ----------
router.post('/auth/register', authLimiter, validate({ body: S.registerBody }), auth.register);
router.post('/auth/login', authLimiter, validate({ body: S.loginBody }), auth.login);

// ---------- everything below needs a valid JWT; each query is scoped to req.user ----------
router.use(protect);

router.get('/auth/me', auth.me);
router.put('/auth/profile', validate({ body: S.profileBody }), auth.updateProfile);
router.put('/auth/password', authLimiter, validate({ body: S.passwordBody }), auth.changePassword);

router.get('/dashboard', analytics.getDashboard);
router.get('/analytics', validate({ query: S.rangeQuery }), analytics.getAnalytics);

router.get('/transactions', validate({ query: S.transactionQuery }), tx.listTransactions);
router.post('/transactions', validate({ body: S.transactionBody }), tx.createTransaction);
router.put('/transactions/:id', validate({ params: S.idParams, body: S.transactionUpdateBody }), tx.updateTransaction);
router.delete('/transactions/:id', validate({ params: S.idParams }), tx.deleteTransaction);

router.get('/budgets', validate({ query: S.budgetQuery }), budget.listBudgets);
router.put('/budgets', validate({ body: S.budgetBody }), budget.upsertBudget);
router.post('/budgets/copy-previous', validate({ body: S.budgetCopyBody }), budget.copyPreviousBudgets);
router.delete('/budgets/:id', validate({ params: S.idParams }), budget.deleteBudget);

router.get('/goals', goal.listGoals);
router.post('/goals', validate({ body: S.goalBody }), goal.createGoal);
router.put('/goals/:id', validate({ params: S.idParams, body: S.goalUpdateBody }), goal.updateGoal);
router.delete('/goals/:id', validate({ params: S.idParams }), goal.deleteGoal);
router.post('/goals/:id/contribute', validate({ params: S.idParams, body: S.contributeBody }), goal.contribute);

router.get('/recurring', recurring.listRecurring);
router.post('/recurring', validate({ body: S.recurringBody }), recurring.createRecurring);
router.post('/recurring/process', recurring.runRecurringNow);
router.put('/recurring/:id', validate({ params: S.idParams, body: S.recurringUpdateBody }), recurring.updateRecurring);
router.delete('/recurring/:id', validate({ params: S.idParams }), recurring.deleteRecurring);

router.get('/bills', bill.listBills);
router.post('/bills', validate({ body: S.billBody }), bill.createBill);
router.put('/bills/:id', validate({ params: S.idParams, body: S.billUpdateBody }), bill.updateBill);
router.post('/bills/:id/pay', validate({ params: S.idParams }), bill.payBill);
router.delete('/bills/:id', validate({ params: S.idParams }), bill.deleteBill);

router.get('/notifications', notif.listNotifications);
router.post('/notifications/read-all', notif.markAllRead);
router.delete('/notifications', notif.clearNotifications);
router.patch('/notifications/:id/read', validate({ params: S.idParams }), notif.markRead);
router.delete('/notifications/:id', validate({ params: S.idParams }), notif.deleteNotification);

router.post('/assistant/chat', assistantLimiter, validate({ body: S.chatBody }), assistant.chat);

router.get('/reports/summary', validate({ query: S.reportQuery }), report.getReport);
router.get('/reports/export/csv', validate({ query: S.exportQuery }), report.exportCsv);
router.get('/reports/export/pdf', validate({ query: S.reportQuery }), report.exportPdf);

export default router;