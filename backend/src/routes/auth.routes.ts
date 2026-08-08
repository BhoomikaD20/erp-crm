import { Router } from 'express';
import { body } from 'express-validator';
import { login, me } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email is required'), body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  asyncHandler(login)
);

router.get('/me', authenticate, asyncHandler(me));

export default router;