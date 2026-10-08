import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormTemplate {
  name: string;
  description: string;
  category: string;
  schema: { fields: FormField[] };
}

const forms: FormTemplate[] = [
  {
    name: 'Vendor Registration',
    description: 'Standard vendor onboarding form',
    category: 'REGISTRATION',
    schema: {
      fields: [
        { name: 'businessName', label: 'Business Name', type: 'text', required: true },
        { name: 'contactEmail', label: 'Contact Email', type: 'email', required: true },
        { name: 'contactPhone', label: 'Contact Phone', type: 'tel', required: true },
        { name: 'gstNumber', label: 'GST Number', type: 'text', required: false },
        { name: 'address', label: 'Business Address', type: 'textarea', required: true },
        {
          name: 'cuisineType',
          label: 'Cuisine Type',
          type: 'select',
          required: true,
          options: ['Indian', 'Chinese', 'Continental', 'Fast Food', 'Other'],
        },
        { name: 'fssaiLicense', label: 'FSSAI License Number', type: 'text', required: false },
        { name: 'bankAccount', label: 'Bank Account Number', type: 'text', required: false },
        { name: 'ifscCode', label: 'IFSC Code', type: 'text', required: false },
      ],
    },
  },
  {
    name: 'Vendor Renewal',
    description: 'Annual vendor contract renewal form',
    category: 'RENEWAL',
    schema: {
      fields: [
        { name: 'vendorCode', label: 'Vendor Code', type: 'text', required: true },
        { name: 'renewalPeriod', label: 'Renewal Period (months)', type: 'number', required: true },
        { name: 'proposedRate', label: 'Proposed Daily Rate (₹)', type: 'number', required: true },
        { name: 'remarks', label: 'Remarks', type: 'textarea', required: false },
      ],
    },
  },
  {
    name: 'Menu Submission',
    description: 'Weekly menu submission form',
    category: 'MENU',
    schema: {
      fields: [
        { name: 'weekStartDate', label: 'Week Start Date', type: 'date', required: true },
        { name: 'mondayMenu', label: 'Monday Menu', type: 'textarea', required: false, placeholder: 'e.g. Dal Rice, Sabzi, Roti' },
        { name: 'tuesdayMenu', label: 'Tuesday Menu', type: 'textarea', required: false },
        { name: 'wednesdayMenu', label: 'Wednesday Menu', type: 'textarea', required: false },
        { name: 'thursdayMenu', label: 'Thursday Menu', type: 'textarea', required: false },
        { name: 'fridayMenu', label: 'Friday Menu', type: 'textarea', required: false },
        { name: 'thaliPrice', label: 'Thali Price (₹)', type: 'number', required: true },
      ],
    },
  },
];

async function main() {
  console.log('Seeding vendor form templates...');

  for (const form of forms) {
    const existing = await prisma.formTemplate.findFirst({
      where: { title: form.name },
    });

    if (existing) {
      await prisma.formTemplate.update({
        where: { id: existing.id },
        data: {
          description: form.description,
          schema: form.schema as unknown as object,
        },
      });
      console.log(`  Updated: ${form.name}`);
    } else {
      await prisma.formTemplate.create({
        data: {
          key: form.name.toLowerCase().replace(/\s+/g, '_'),
          title: form.name,
          description: form.description,
          targetRole: 'VENDOR' as any,
          schema: form.schema as unknown as object,
        },
      });
      console.log(`  Created: ${form.name}`);
    }
  }

  console.log('Done seeding vendor form templates.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
