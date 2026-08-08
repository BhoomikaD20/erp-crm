import { ChallanStatus, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.salesChallan.count();
  const next = (count + 1).toString().padStart(5, '0');
  return `CH-${year}-${next}`;
}

export async function createChallan(req: Request, res: Response) {
  const { customerId, items } = req.body as { customerId: string; items: ChallanItemInput[] };

  if (!items || items.length === 0) throw new ApiError(400, 'At least one product line is required');

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const result = await prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    let totalQuantity = 0;
    const itemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
      if (item.quantity <= 0) throw new ApiError(400, `Quantity must be positive for product ${product.name}`);

      totalQuantity += item.quantity;
      itemsData.push({
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitPriceSnapshot: product.unitPrice,
        quantity: item.quantity,
      });
    }

    const challan = await tx.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: 'DRAFT',
        createdById: req.user?.id,
        items: { create: itemsData },
      },
      include: { items: true, customer: true },
    });

    return challan;
  });

  res.status(201).json({ success: true, data: result });
}

export async function confirmChallan(req: Request, res: Response) {
  const { id } = req.params;

  const result = await prisma.$transaction(async (tx) => {
    const challan = await tx.salesChallan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw new ApiError(404, 'Challan not found');
    if (challan.status !== 'DRAFT') {
      throw new ApiError(400, `Only DRAFT challans can be confirmed. Current status: ${challan.status}`);
    }

    for (const item of challan.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new ApiError(404, `Product no longer exists: ${item.skuSnapshot}`);
      if (product.currentStock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for ${product.name} (${product.sku}). Available: ${product.currentStock}, required: ${item.quantity}`
        );
      }
    }

    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'OUT',
          reason: `Sales challan ${challan.challanNumber} confirmed`,
          createdById: req.user?.id,
        },
      });
    }

    const updated = await tx.salesChallan.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { items: true, customer: true },
    });

    return updated;
  });

  res.json({ success: true, data: result });
}

export async function cancelChallan(req: Request, res: Response) {
  const { id } = req.params;

  const challan = await prisma.salesChallan.findUnique({ where: { id } });
  if (!challan) throw new ApiError(404, 'Challan not found');
  if (challan.status === 'CANCELLED') throw new ApiError(400, 'Challan is already cancelled');

  const result = await prisma.$transaction(async (tx) => {
    if (challan.status === 'CONFIRMED') {
      const items = await tx.challanItem.findMany({ where: { challanId: id } });
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.quantity } } });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'IN',
            reason: `Sales challan ${challan.challanNumber} cancelled - stock reversed`,
            createdById: req.user?.id,
          },
        });
      }
    }

    return tx.salesChallan.update({ where: { id }, data: { status: 'CANCELLED' }, include: { items: true, customer: true } });
  });

  res.json({ success: true, data: result });
}

export async function listChallans(req: Request, res: Response) {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const status = req.query.status as ChallanStatus | undefined;
  const customerId = req.query.customerId as string | undefined;

  const where: Prisma.SalesChallanWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [total, challans] = await Promise.all([
    prisma.salesChallan.count({ where }),
    prisma.salesChallan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: true },
    }),
  ]);

  res.json({ success: true, data: challans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function getChallan(req: Request, res: Response) {
  const { id } = req.params;
  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!challan) throw new ApiError(404, 'Challan not found');
  res.json({ success: true, data: challan });
}