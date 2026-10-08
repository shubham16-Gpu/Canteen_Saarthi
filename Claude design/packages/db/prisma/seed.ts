import { PrismaClient, Role } from "@prisma/client";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // ── Super Admin ──
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@canteen.app" },
    update: {},
    create: {
      id: randomUUID(),
      email: "admin@canteen.app",
      name: "Super Admin",
      phone: "+919999999999",
      role: Role.SUPER_ADMIN,
      passwordHash: hashPassword("admin@123"),
      isActive: true,
    },
  });
  console.log(`Created super admin: ${superAdmin.email}`);

  // ── Organization ──
  const org = await prisma.organization.upsert({
    where: { slug: "amnex-infotechnologies" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Amnex Infotechnologies",
      slug: "amnex-infotechnologies",
      address: "Ahmedabad, Gujarat, India",
      isActive: true,
    },
  });
  console.log(`Created organization: ${org.name}`);

  // ── Canteen ──
  const canteen = await prisma.canteen.upsert({
    where: { id: org.id + "-canteen" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Main Canteen",
      organizationId: org.id,
      address: "Ground Floor, Building A",
      isActive: true,
    },
  });
  console.log(`Created canteen: ${canteen.name}`);

  // ── Outlet ──
  const outlet = await prisma.outlet.create({
    data: {
      id: randomUUID(),
      name: "Main Food Court",
      canteenId: canteen.id,
      type: "FOOD_COURT",
      isActive: true,
    },
  });
  console.log(`Created outlet: ${outlet.name}`);

  // ── Categories ──
  const categoryData = [
    { name: "Breakfast", slug: "breakfast", icon: "sunrise", sortOrder: 1 },
    { name: "Lunch", slug: "lunch", icon: "utensils", sortOrder: 2 },
    { name: "Snacks", slug: "snacks", icon: "cookie", sortOrder: 3 },
    { name: "Beverages", slug: "beverages", icon: "coffee", sortOrder: 4 },
    { name: "Dinner", slug: "dinner", icon: "moon", sortOrder: 5 },
  ];

  const categories: Record<string, string> = {};

  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        id: randomUUID(),
        ...cat,
        isActive: true,
      },
    });
    categories[cat.slug] = created.id;
  }
  console.log("Created categories: Breakfast, Lunch, Snacks, Beverages, Dinner");

  // ── Sample Menu Items ──
  const menuItems = [
    {
      name: "Masala Dosa",
      description: "Crispy dosa with potato masala, served with chutney and sambar",
      price: 60,
      categoryId: categories["breakfast"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 10,
      calories: 350,
    },
    {
      name: "Poha",
      description: "Flattened rice with peanuts and spices",
      price: 40,
      categoryId: categories["breakfast"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 8,
      calories: 250,
    },
    {
      name: "Veg Thali",
      description: "Complete meal with roti, rice, dal, sabzi, salad, and sweet",
      price: 120,
      categoryId: categories["lunch"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 15,
      calories: 650,
    },
    {
      name: "Chicken Biryani",
      description: "Fragrant basmati rice with tender chicken pieces",
      price: 180,
      categoryId: categories["lunch"]!,
      outletId: outlet.id,
      isVeg: false,
      preparationTime: 20,
      calories: 750,
    },
    {
      name: "Samosa",
      description: "Crispy pastry filled with spiced potato",
      price: 20,
      categoryId: categories["snacks"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 5,
      calories: 200,
    },
    {
      name: "Masala Chai",
      description: "Traditional Indian spiced tea",
      price: 15,
      categoryId: categories["beverages"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 3,
      calories: 80,
    },
    {
      name: "Cold Coffee",
      description: "Chilled coffee blended with milk and ice cream",
      price: 60,
      categoryId: categories["beverages"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 5,
      calories: 180,
    },
    {
      name: "Paneer Butter Masala",
      description: "Cottage cheese in rich tomato gravy, served with naan",
      price: 150,
      categoryId: categories["dinner"]!,
      outletId: outlet.id,
      isVeg: true,
      preparationTime: 15,
      calories: 550,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        id: randomUUID(),
        ...item,
        isAvailable: true,
        allergens: [],
      },
    });
  }
  console.log(`Created ${menuItems.length} sample menu items`);

  // ── Meal Slots ──
  const mealSlots = [
    { name: "Breakfast", startTime: "07:00", endTime: "10:00" },
    { name: "Lunch", startTime: "12:00", endTime: "15:00" },
    { name: "Snacks", startTime: "16:00", endTime: "18:00" },
    { name: "Dinner", startTime: "19:00", endTime: "22:00" },
  ];

  for (const slot of mealSlots) {
    await prisma.mealSlot.create({
      data: {
        id: randomUUID(),
        ...slot,
        canteenId: canteen.id,
        isActive: true,
      },
    });
  }
  console.log("Created meal slots");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
