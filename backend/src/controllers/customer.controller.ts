import { CustomerStatus, CustomerType, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';

export async function createCustomer(req: Request, res: Response) {
  const { name, mobile, email, businessName, gstNumber, customerType, address, status, followUpDate, notes } = req.body;

  const customer = await prisma.customer.create({
    data: {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType: customerType || 'RETAIL',
      address,
      status: status || 'LEAD',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes,
      createdById: req.user?.id,
    },
  });

  res.status(201).json({ success: true, data: customer });
}

export async function updateCustomer(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Customer not found');

  const { followUpDate, ...rest } = req.body;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...rest,
      ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
    },
  });

  res.json({ success: true, data: customer });
}

export async function listCustomers(req: Request, res: Response) {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);
  const search = (req.query.search as string) || '';
  const status = req.query.status as CustomerStatus | undefined;
  const customerType = req.query.customerType as CustomerType | undefined;

  const where: Prisma.CustomerWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(customerType ? { customerType } : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getCustomer(req: Request, res: Response) {
  const { id } = req.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: { orderBy: { createdAt: 'desc' } },
      challans: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!customer) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, data: customer });
}

export async function addFollowUp(req: Request, res: Response) {
  const { id } = req.params;
  const { note, followUpDate } = req.body;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const followUp = await prisma.followUp.create({
    data: {
      customerId: id,
      note,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      createdById: req.user?.id,
    },
  });

  if (followUpDate) {
    await prisma.customer.update({ where: { id }, data: { followUpDate: new Date(followUpDate) } });
  }

  res.status(201).json({ success: true, data: followUp });
}