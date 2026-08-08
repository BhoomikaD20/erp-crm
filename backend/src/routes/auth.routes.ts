import { Router } from 'express';
import { body } from 'express-validator';

import {
  login,
  register,
} from '../controllers/auth.controller';

import { validateRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),

    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validateRequest,
  asyncHandler(login)
);

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required'),

    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),

    body('role')
      .optional()
      .isIn([
        'ADMIN',
        'SALES',
        'WAREHOUSE',
        'ACCOUNTS',
      ])
      .withMessage('Invalid role'),
  ],
  validateRequest,
  asyncHandler(register)
);

export default router;