import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function getDeviceTokens(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];

  const devices = await prisma.pushDevice.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
    select: { token: true },
  });

  return devices.map((d: any) => d.token);
}

export async function sendPushNotification(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  const tokens = await getDeviceTokens(userIds);

  if (!tokens.length) {
    console.log(`[PushService] No device tokens for users: ${userIds.join(', ')}`);
    return;
  }

  // FCM endpoint (requires GOOGLE_FCM_SERVER_KEY env)
  const fcmKey = process.env.GOOGLE_FCM_SERVER_KEY;

  if (!fcmKey) {
    console.warn(
      `[PushService] GOOGLE_FCM_SERVER_KEY not set. Skipping push for ${tokens.length} devices.`,
    );
    console.log(
      `[PushService] Would send: ${payload.title} — ${payload.body} to ${tokens.length} tokens`,
    );
    return;
  }

  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmKey}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      }),
    });

    const json = await res.json() as { success?: number; failure?: number };
    console.log(
      `[PushService] FCM result: ${json.success ?? 0} success, ${json.failure ?? 0} failure`,
    );
  } catch (err) {
    console.error('[PushService] FCM send error:', err);
  }
}

export async function broadcastPush(
  role: string,
  payload: PushPayload,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: role as any, isActive: true },
    select: { id: true },
  });

  const userIds = users.map((u: { id: string }) => u.id);
  await sendPushNotification(userIds, payload);
}
