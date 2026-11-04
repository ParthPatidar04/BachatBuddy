import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Not authenticated', 401);

  const payload = jwt.verify(token, process.env.JWT_SECRET); // errors handled in errorHandler
  const user = await User.findById(payload.id);
  if (!user) throw new AppError('This account no longer exists', 401);

  req.user = user;
  next();
});