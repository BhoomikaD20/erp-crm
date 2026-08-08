import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import {
  uploadProductImage,
  isS3Configured,
} from '../config/s3';

/**
 * Convert Prisma Decimal to a frontend-friendly string.
 */
function serializeProduct(product: any) {
  return {
    ...product,
    unitPrice: product.unitPrice?.toString(),
  };
}

/**
 * Create product
 */
export async function createProduct(req: Request, res: Response) {
  const {
    name,
    sku,
    category,
    unitPrice,
    currentStock,
    minStockAlertQty,
    location,
  } = req.body;

  const existing = await prisma.product.findUnique({
    where: { sku },
  });

  if (existing) {
    throw new ApiError(
      409,
      `Product with SKU '${sku}' already exists`
    );
  }

  const stock = currentStock ?? 0;

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        name,
        sku,
        category: category || null,
        unitPrice,
        currentStock: stock,
        minStockAlertQty: minStockAlertQty ?? 0,
        location: location || null,
      },
    });

    if (stock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: createdProduct.id,
          quantity: stock,
          movementType: 'IN',
          reason: 'Initial stock on product creation',
          createdById: req.user?.id,
        },
      });
    }

    return createdProduct;
  });

  res.status(201).json({
    success: true,
    data: serializeProduct(product),
  });
}

/**
 * Update product
 *
 * Important:
 * If currentStock is changed during edit, we create
 * an appropriate stock movement so the inventory history
 * remains accurate.
 */
export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, 'Product not found');
  }

  const {
    name,
    sku,
    category,
    unitPrice,
    currentStock,
    minStockAlertQty,
    location,
  } = req.body;

  if (sku && sku !== existing.sku) {
    const duplicate = await prisma.product.findUnique({
      where: { sku },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ApiError(
        409,
        `Product with SKU '${sku}' already exists`
      );
    }
  }

  const hasStockChange =
    currentStock !== undefined &&
    Number(currentStock) !== existing.currentStock;

  const newStock =
    currentStock !== undefined
      ? Number(currentStock)
      : existing.currentStock;

  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new ApiError(
      400,
      'Current stock must be a non-negative integer'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && {
          category: category || null,
        }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(currentStock !== undefined && {
          currentStock: newStock,
        }),
        ...(minStockAlertQty !== undefined && {
          minStockAlertQty,
        }),
        ...(location !== undefined && {
          location: location || null,
        }),
      },
    });

    if (hasStockChange) {
      const difference =
        newStock - existing.currentStock;

      await tx.stockMovement.create({
        data: {
          productId: id,
          quantity: Math.abs(difference),
          movementType:
            difference > 0 ? 'IN' : 'OUT',
          reason: 'Manual stock adjustment during product update',
          createdById: req.user?.id,
        },
      });
    }

    return product;
  });

  res.json({
    success: true,
    data: serializeProduct(result),
  });
}

/**
 * List products
 */
export async function listProducts(
  req: Request,
  res: Response
) {
  const page = Math.max(
    parseInt((req.query.page as string) || '1', 10),
    1
  );

  const limit = Math.min(
    Math.max(
      parseInt((req.query.limit as string) || '20', 10),
      1
    ),
    100
  );

  const search =
    (req.query.search as string) || '';

  const lowStock =
    req.query.lowStock === 'true';

  const where: Prisma.ProductWhereInput = {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              sku: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              category: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  if (lowStock) {
    const allMatching =
      await prisma.product.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

    const lowStockProducts =
      allMatching.filter(
        (product) =>
          product.currentStock <=
          product.minStockAlertQty
      );

    const total = lowStockProducts.length;

    const products = lowStockProducts.slice(
      (page - 1) * limit,
      page * limit
    );

    return res.json({
      success: true,
      data: products.map(serializeProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  const [total, products] =
    await Promise.all([
      prisma.product.count({ where }),

      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

  res.json({
    success: true,
    data: products.map(serializeProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * Get single product
 */
export async function getProduct(
  req: Request,
  res: Response
) {
  const { id } = req.params;

  const product =
    await prisma.product.findUnique({
      where: { id },

      include: {
        stockMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,

          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

  if (!product) {
    throw new ApiError(
      404,
      'Product not found'
    );
  }

  res.json({
    success: true,
    data: serializeProduct(product),
  });
}

/**
 * Get stock movement history
 *
 * This endpoint was missing from your original routes.
 */
export async function getStockMovements(
  req: Request,
  res: Response
) {
  const { id } = req.params;

  const product =
    await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

  if (!product) {
    throw new ApiError(
      404,
      'Product not found'
    );
  }

  const movements =
    await prisma.stockMovement.findMany({
      where: {
        productId: id,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

  res.json({
    success: true,
    data: movements,
  });
}

/**
 * Create stock movement
 */
export async function createStockMovement(
  req: Request,
  res: Response
) {
  const { id } = req.params;

  const {
    quantity,
    movementType,
    reason,
  } = req.body as {
    quantity: number;
    movementType: 'IN' | 'OUT';
    reason: string;
  };

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new ApiError(
      400,
      'Quantity must be a positive integer'
    );
  }

  if (
    movementType !== 'IN' &&
    movementType !== 'OUT'
  ) {
    throw new ApiError(
      400,
      "movementType must be 'IN' or 'OUT'"
    );
  }

  if (!reason?.trim()) {
    throw new ApiError(
      400,
      'Reason is required'
    );
  }

  const result =
    await prisma.$transaction(async (tx) => {
      const product =
        await tx.product.findUnique({
          where: { id },
        });

      if (!product) {
        throw new ApiError(
          404,
          'Product not found'
        );
      }

      const newStock =
        movementType === 'IN'
          ? product.currentStock + quantity
          : product.currentStock - quantity;

      if (newStock < 0) {
        throw new ApiError(
          400,
          `Insufficient stock. Current stock: ${product.currentStock}, requested OUT: ${quantity}`
        );
      }

      const updatedProduct =
        await tx.product.update({
          where: { id },

          data: {
            currentStock: newStock,
          },
        });

      const movement =
        await tx.stockMovement.create({
          data: {
            productId: id,
            quantity,
            movementType,
            reason: reason.trim(),
            createdById: req.user?.id,
          },

          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

      return {
        updatedProduct,
        movement,
      };
    });

  res.status(201).json({
    success: true,

    data: {
      product: serializeProduct(
        result.updatedProduct
      ),
      movement: result.movement,
    },
  });
}

/**
 * Upload product image
 */
export async function uploadProductImageHandler(
  req: Request,
  res: Response
) {
  if (!isS3Configured) {
    throw new ApiError(
      501,
      'Image upload is not configured on this server. Configure AWS S3 environment variables to enable image uploads.'
    );
  }

  const { id } = req.params;

  const product =
    await prisma.product.findUnique({
      where: { id },
    });

  if (!product) {
    throw new ApiError(
      404,
      'Product not found'
    );
  }

  if (!req.file) {
    throw new ApiError(
      400,
      'No image file uploaded. Field name must be "image".'
    );
  }

  const imageUrl =
    await uploadProductImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

  const updated =
    await prisma.product.update({
      where: { id },

      data: {
        imageUrl,
      },
    });

  res.json({
    success: true,
    data: serializeProduct(updated),
  });
}