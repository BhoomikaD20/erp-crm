import { Router } from 'express';
import { body } from 'express-validator';

import {
  createProduct,
  updateProduct,
  listProducts,
  getProduct,
  getStockMovements,
  createStockMovement,
  uploadProductImageHandler,
} from '../controllers/product.controller';

import { validateRequest } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

// GET PRODUCTS
router.get(
  '/',
  asyncHandler(listProducts)
);

// GET STOCK MOVEMENT HISTORY
router.get(
  '/:id/stock-movements',
  asyncHandler(getStockMovements)
);

// GET SINGLE PRODUCT
router.get(
  '/:id',
  asyncHandler(getProduct)
);

// CREATE PRODUCT
router.post(
  '/',
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required'),

    body('sku')
      .notEmpty()
      .withMessage('SKU is required'),

    body('unitPrice')
      .isFloat({ gt: 0 })
      .withMessage('Unit price must be a positive number'),
  ],
  validateRequest,
  asyncHandler(createProduct)
);

// UPDATE PRODUCT
router.put(
  '/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  asyncHandler(updateProduct)
);

// CREATE STOCK MOVEMENT
router.post(
  '/:id/stock-movement',
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('quantity')
      .isInt({ gt: 0 })
      .withMessage('Quantity must be a positive integer'),

    body('movementType')
      .isIn(['IN', 'OUT'])
      .withMessage("movementType must be 'IN' or 'OUT'"),

    body('reason')
      .notEmpty()
      .withMessage('Reason is required'),
  ],
  validateRequest,
  asyncHandler(createStockMovement)
);

// UPLOAD PRODUCT IMAGE
router.post(
  '/:id/image',
  authorize('ADMIN', 'WAREHOUSE'),
  upload.single('image'),
  asyncHandler(uploadProductImageHandler)
);

export default router;