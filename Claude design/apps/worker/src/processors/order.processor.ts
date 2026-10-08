import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrderJobData {
  orderId: string;
  action: 'process' | 'cancel' | 'refund';
}

export async function processOrderJob(job: Job<OrderJobData>): Promise<void> {
  const { orderId, action } = job.data;

  console.log(`[OrderProcessor] Processing job ${job.id}: ${action} order ${orderId}`);

  try {
    await prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        console.warn(`[OrderProcessor] Order ${orderId} not found`);
        return;
      }

      switch (action) {
        case 'process':
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PROCESSING', processedAt: new Date() },
          });
          break;

        case 'cancel':
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });
          break;

        case 'refund':
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'REFUNDED', refundedAt: new Date() },
          });
          break;

        default:
          console.warn(`[OrderProcessor] Unknown action: ${action}`);
      }
    });

    console.log(`[OrderProcessor] Done: ${action} on ${orderId}`);
  } catch (err) {
    console.error(`[OrderProcessor] Error processing order ${orderId}:`, err);
    throw err;
  }
}
