import { PrismaClient, Role } from '@prisma/client';
import { createHash } from 'crypto';

const p = new PrismaClient();
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

async function run() {
  // Delete previous demo users
  await p.user.deleteMany({
    where: {
      OR: [
        { email: 'admin@canteen.app' },
        { email: 'manager@canteen.app' },
        { email: { contains: '@vendor.canteen.local' } },
      ],
    },
  });

  // Super Admin
  await p.user.upsert({
    where: { email_role: { email: 'mehrasam1996@gmail.com', role: Role.SUPER_ADMIN } },
    update: { passwordHash: hash('Super@user'), name: 'Super Admin', isActive: true },
    create: {
      email: 'mehrasam1996@gmail.com',
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      passwordHash: hash('Super@user'),
      isActive: true,
    },
  });

  // Admin
  await p.user.upsert({
    where: { email_role: { email: 'mehrasam1996@gmail.com', role: Role.ADMIN } },
    update: { passwordHash: hash('Admin@123'), name: 'Admin', isActive: true },
    create: {
      email: 'mehrasam1996@gmail.com',
      name: 'Admin',
      role: Role.ADMIN,
      passwordHash: hash('Admin@123'),
      isActive: true,
    },
  });

  // Vendor (login with id Vendor_123)
  await p.user.upsert({
    where: { email_role: { email: 'vendor_123@vendor.canteen.local', role: Role.VENDOR } },
    update: { passwordHash: hash('iamvendor-01'), name: 'Vendor 123', isActive: true },
    create: {
      email: 'vendor_123@vendor.canteen.local',
      name: 'Vendor 123',
      role: Role.VENDOR,
      passwordHash: hash('iamvendor-01'),
      isActive: true,
    },
  });

  console.log('Seeded:');
  console.log('  Super Admin: mehrasam1996@gmail.com / Super@user');
  console.log('  Admin:       mehrasam1996@gmail.com / Admin@123');
  console.log('  Vendor:      Vendor_123 / iamvendor-01');

  await p.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
