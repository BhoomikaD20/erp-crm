import { Router } from 'express';
import { body } from 'express-validator';
import {
  createCustomer,
  updateCustomer,
  listCustomers,
  getCustomer,
  addFollowUp,
} from '../controllers/customer.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(listCustomers));
router.get('/:id', asyncHandler(getCustomer));

router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('mobile').notEmpty().withMessage('Mobile number is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('customerType').optional().isIn(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
    body('status').optional().isIn(['LEAD', 'ACTIVE', 'INACTIVE']),
  ],
  validateRequest,
  asyncHandler(createCustomer)
);

router.put('/:id', authorize('ADMIN', 'SALES'), asyncHandler(updateCustomer));

router.post(
  '/:id/follow-up',
  authorize('ADMIN', 'SALES'),
  [body('note').notEmpty().withMessage('Note is required')],
  validateRequest,
  asyncHandler(addFollowUp)
);

export default router;