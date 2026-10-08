import { PrismaClient, Role } from '@prisma/client';
import { createHash } from 'crypto';
const p = new PrismaClient();
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
async function run() {
  await p.user.upsert({
    where: { email: 'manager@canteen.app' },
    update: { passwordHash: hash('admin@123'), role: Role.ADMIN, isActive: true },
    create: { email: 'manager@canteen.app', name: 'Canteen Manager', phone: '+919999988888', role: Role.ADMIN, passwordHash: hash('admin@123'), isActive: true },
  });
  console.log('ADMIN seeded: manager@canteen.app / admin@123');
  await p.$disconnect();
}
run();
