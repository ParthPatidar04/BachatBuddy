# BachatBuddy

A full-stack personal finance tracker to record income and expenses, set budgets, save for goals, track bills and get answers from an AI money assistant.

**Live demo:** <your-vercel-url>
**Backend API:** <your-render-url>/api/health

> The backend runs on a free Render plan, so the first request after a break can take 30-50 seconds.

## Features

- **Authentication:** register and login with JWT, each user sees only their own data
- **Dashboard:** balance, income, expenses, savings, recent transactions and charts
- **Transactions:** add, edit, delete, with search, filter, sort and pagination
- **Analytics:** category-wise spending, monthly trends, income vs expense
- **Budgets:** monthly overall and category budgets with near-limit and exceeded alerts
- **Savings goals:** create goals, add money to them and track progress
- **Recurring transactions:** daily, weekly, monthly or yearly, created automatically when due
- **Bill reminders:** due dates, overdue status and "Mark as paid" which records an expense
- **AI assistant:** asks questions about your own spending, powered by the Gemini API (with a simple fallback reply when the API key is not set)
- **Reports:** monthly and yearly summary, download as CSV or PDF
- **Notifications:** in-app alerts for budgets, bills and goals
- **Light and dark theme**, responsive on mobile and desktop

## Tech Stack

| Part | Tools |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, Recharts, Lucide React, Axios, React Router |
| Backend | Node.js, Express 4, Mongoose, Zod, JWT, bcryptjs, Helmet, CORS, PDFKit |
| Database | MongoDB (MongoDB Atlas in production) |
| AI | Google Gemini API |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Project Structure

```
BachatBuddy/
├── backend/
│   ├── config/         # database connection
│   ├── controllers/    # request handlers
│   ├── middleware/     # auth, validation, error handler
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # business logic (budgets, goals, AI, reports)
│   ├── utils/          # helpers
│   ├── validators/     # Zod schemas
│   ├── app.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/        # axios client
        ├── components/ # reusable UI
        ├── context/    # auth, theme, toast, data
        ├── hooks/
        ├── pages/
        └── utils/
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB running locally, or a MongoDB Atlas connection string
- (Optional) A Gemini API key from Google AI Studio

### 1. Clone the repo

```bash
git clone https://github.com/ParthPatidar04/BachatBuddy.git
cd BachatBuddy
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/finance-tracker
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_key_optional
GEMINI_MODEL=your_gemini_model_name
```

Start the server:

```bash
npm run dev
```

The API runs on http://localhost:5000 and the health check is at `/api/health`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the app:

```bash
npm run dev
```

Open http://localhost:5173.

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `PORT` | backend | Server port (Render sets this automatically) |
| `NODE_ENV` | backend | `development` or `production` |
| `MONGO_URI` | backend | MongoDB connection string |
| `JWT_SECRET` | backend | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | backend | Token lifetime, for example `7d` |
| `CLIENT_URL` | backend | Frontend URL allowed by CORS (no trailing slash) |
| `GEMINI_API_KEY` | backend | Optional, enables Gemini replies |
| `GEMINI_MODEL` | backend | Gemini model name |
| `VITE_API_URL` | frontend | Backend API base URL, ending with `/api` |

## API Overview

All routes start with `/api`. Everything except `/auth/register`, `/auth/login` and `/health` needs a JWT in the `Authorization: Bearer <token>` header.

| Group | Purpose |
|---|---|
| `/auth` | register, login, profile, change password |
| `/transactions` | CRUD with search, filter, sort, pagination |
| `/budgets` | monthly budgets and usage |
| `/goals` | savings goals and contributions |
| `/recurring` | recurring transaction rules |
| `/bills` | bills, reminders, mark as paid |
| `/analytics` | dashboard and chart data |
| `/assistant` | AI chat |
| `/reports` | summary, CSV export, PDF export |
| `/notifications` | list and mark as read |

## Deployment

1. **Database:** create a free cluster on MongoDB Atlas, add a database user, and allow access from `0.0.0.0/0`.
2. **Backend (Render):** root directory `backend`, build command `npm install`, start command `npm start`, then add the backend environment variables.
3. **Frontend (Vercel):** root directory `frontend`, add `VITE_API_URL`. The `frontend/vercel.json` file makes page refresh work with React Router.
4. Set `CLIENT_URL` on Render to the Vercel URL, then redeploy.

## Design Decisions

- Balance = income - expenses - money held in savings goals, so goal money is not counted as spendable.
- All dates are handled in UTC to avoid day-shift bugs.
- Recurring transactions are claimed atomically so the same occurrence is not created twice.
- Zod validates every request body, query and params on the server.

## Screenshots

<!-- Add screenshots here, for example: -->
<!-- ![Dashboard](./screenshots/dashboard.png) -->

## Author

**Parth Patidar**
GitHub: [@ParthPatidar04](https://github.com/ParthPatidar04)