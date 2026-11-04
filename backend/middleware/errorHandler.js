import { ZodError } from 'zod';

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    const first = errors[0];
    return res.status(400).json({
      message: first?.field ? `${first.field}: ${first.message}` : first?.message || 'Invalid input',
      errors,
    });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists' });
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });

  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
};