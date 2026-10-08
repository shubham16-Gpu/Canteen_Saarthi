const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const email = 'vendor_123@vendor.canteen.local';
  const user = await p.user.findUnique({ where: { email_role: { email, role: 'VENDOR' } } });
  if (!user) { console.error('no vendor user'); process.exit(1); }
  console.log('user id:', user.id);

  // Ensure org exists
  let org = await p.organization.findFirst();
  if (!org) {
    org = await p.organization.create({
      data: { name: 'Default Org', slug: 'default-org' },
    }).catch(async (e) => {
      console.log('org create error, trying minimal:', e.message);
      return p.organization.create({ data: { name: 'Default Org' } });
    });
    console.log('created org:', org.id);
  } else {
    console.log('using org:', org.id);
  }

  let vendor = await p.vendor.findFirst({ where: { userId: user.id } });
  if (!vendor) {
    vendor = await p.vendor.findUnique({ where: { vendorCode: 'VEND001' } }).catch(() => null);
  }
  if (!vendor) {
    vendor = await p.vendor.create({
      data: {
        user: { connect: { id: user.id } },
        organization: { connect: { id: org.id } },
        vendorCode: 'VEND001',
        businessName: 'Shree Annapurna Foods',
        ownerName: 'Ramesh Kumar Patel',
        contactEmail: 'vendor1@example.com',
        contactPhone: '9876543210',
        isActive: true,
      },
    });
    console.log('created vendor:', vendor.id, vendor.vendorCode);
  } else {
    if (!vendor.userId) {
      vendor = await p.vendor.update({ where: { id: vendor.id }, data: { userId: user.id } });
      console.log('linked existing vendor:', vendor.id);
    } else {
      console.log('vendor already linked:', vendor.id);
    }
  }
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
