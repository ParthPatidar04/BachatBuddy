import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { processAllDue } from './services/recurringService.js';

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me') {
  console.error('Set a strong JWT_SECRET in your .env file before starting the server.');
  process.exit(1);
}

await connectDB();

const server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

// Background job: generate due recurring transactions for everyone.
// (Rules are also processed on demand when a user opens the app, so a sleeping
// free-tier host never leaves a user with missing transactions.)
const runJob = () => processAllDue().catch((e) => console.error('Recurring job failed:', e.message));
runJob();
const timer = setInterval(runJob, 60 * 60 * 1000);

const shutdown = () => {
  clearInterval(timer);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);