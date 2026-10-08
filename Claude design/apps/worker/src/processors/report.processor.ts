import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ReportJobData {
  type: 'daily' | 'weekly' | 'monthly' | 'inventory';
  date?: string;
  vendorId?: string;
}

export async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const { type, date, vendorId } = job.data;
  const targetDate = date ? new Date(date) : new Date();

  console.log(`[ReportProcessor] Generating ${type} report for ${targetDate.toISOString()}`);

  try {
    if (type === 'daily' || type === 'weekly' || type === 'monthly') {
      const start = new Date(targetDate);
      const end = new Date(targetDate);

      if (type === 'weekly') {
        start.setDate(start.getDate() - 7);
      } else if (type === 'monthly') {
        start.setMonth(start.getMonth() - 1);
      } else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }

      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...(vendorId ? { vendorId } : {}),
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        include: { items: true },
      });

      const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
      const totalOrders = orders.length;
      const totalItems = orders.reduce((sum: number, order: any) => sum + order.items.length, 0);

      await prisma.report.create({
        data: {
          type,
          period: `${start.toISOString()}_${end.toISOString()}`,
          vendorId: vendorId || null,
          data: {
            totalRevenue,
            totalOrders,
            totalItems,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`[ReportProcessor] ${type} report done: ${totalOrders} orders, ₹${totalRevenue}`);
    }

    if (type === 'inventory') {
      const inventoryItems = await prisma.inventory.findMany({
        where: vendorId ? { vendorId } : {},
      });

      const lowStockItems = inventoryItems.filter(
        (item: any) => item.currentStock <= item.reorderLevel,
      );

      await prisma.report.create({
        data: {
          type: 'inventory',
          period: targetDate.toISOString(),
          vendorId: vendorId || null,
          data: {
            totalItems: inventoryItems.length,
            lowStockCount: lowStockItems.length,
            lowStockItems: lowStockItems.map((item: any) => ({
              id: item.id,
              name: item.name,
              currentStock: item.currentStock,
              reorderLevel: item.reorderLevel,
            })),
            generatedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`[ReportProcessor] Inventory report done: ${lowStockItems.length} low-stock items`);
    }
  } catch (err) {
    console.error(`[ReportProcessor] Error generating ${type} report:`, err);
    throw err;
  }
}
