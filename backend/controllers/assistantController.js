import asyncHandler from '../utils/asyncHandler.js';
import { askAssistant } from '../services/aiService.js';

export const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const result = await askAssistant(req.user, message, history);
  res.json(result);
});