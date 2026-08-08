import bcrypt from 'bcryptjs';
import { prisma } from './config/db';

async function main() {
  const password = await bcrypt.hash('Password@123', 10);

  const users = [
    { name: 'Admin User', email: 'admin@erp.test', role: 'ADMIN' as const },
    { name: 'Sales User', email: 'sales@erp.test', role: 'SALES' as const },
    { name: 'Warehouse User', email: 'warehouse@erp.test', role: 'WAREHOUSE' as const },
    { name: 'Accounts User', email: 'accounts@erp.test', role: 'ACCOUNTS' as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
    console.log(`Seeded ${u.role}: ${u.email} / Password@123`);
  }

  await prisma.product.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: {
      name: 'Steel Pipe 2 inch',
      sku: 'SKU-001',
      category: 'Pipes',
      unitPrice: 450.0,
      currentStock: 100,
      minStockAlertQty: 10,
      location: 'Warehouse A',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-002' },
    update: {},
    create: {
      name: 'PVC Fitting Elbow',
      sku: 'SKU-002',
      category: 'Fittings',
      unitPrice: 25.5,
      currentStock: 500,
      minStockAlertQty: 50,
      location: 'Warehouse A',
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });