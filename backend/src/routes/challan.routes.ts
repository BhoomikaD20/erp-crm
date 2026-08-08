import { Router } from 'express';
import { body } from 'express-validator';
import {
  createChallan,
  confirmChallan,
  cancelChallan,
  listChallans,
  getChallan,
} from '../controllers/challan.controller';
import { generateInvoicePdf } from '../controllers/invoice.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(listChallans));
router.get('/:id', asyncHandler(getChallan));

router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  [
    body('customerId').notEmpty().withMessage('customerId is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one product line is required'),
    body('items.*.productId').notEmpty().withMessage('productId is required for each line'),
    body('items.*.quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer'),
  ],
  validateRequest,
  asyncHandler(createChallan)
);

router.post('/:id/confirm', authorize('ADMIN', 'SALES', 'WAREHOUSE'), asyncHandler(confirmChallan));
router.post('/:id/cancel', authorize('ADMIN', 'SALES'), asyncHandler(cancelChallan));
router.get('/:id/invoice', asyncHandler(generateInvoicePdf));

export default router;