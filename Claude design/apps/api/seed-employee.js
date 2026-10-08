const {PrismaClient} = require('@prisma/client');
const {createHash} = require('crypto');
const p = new PrismaClient();

(async () => {
  const email = 'employee@canteen.app';
  const role = 'CUSTOMER'; // employee maps to CUSTOMER role in this schema
  const passwordHash = createHash('sha256').update('emp@123').digest('hex');

  const existing = await p.user.findUnique({ where: { email_role: { email, role } } });
  if (existing) {
    console.log('Already exists:', existing.email, existing.role);
  } else {
    const u = await p.user.create({
      data: {
        email,
        role,
        name: 'Test Employee',
        passwordHash,
        isActive: true,
      },
    });
    console.log('Created:', u.email, u.role, u.id);
  }
  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
