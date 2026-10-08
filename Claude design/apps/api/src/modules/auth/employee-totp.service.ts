import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';

/**
 * Employee TOTP service.
 *
 * Employees primarily authenticate via Google SSO. This service provides a
 * fallback TOTP mechanism for environments where Google SSO is unavailable,
 * or for employees who need an offline redemption code.
 */
@Injectable()
export class EmployeeTotpService {
  private readonly prisma = new PrismaClient();

  /**
   * Generate (or rotate) a TOTP secret for an employee.
   * Returns the secret and a key URI for QR code rendering.
   */
  async setup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(email, 'Canteen', secret);

    await this.prisma.employeeTotpSecret.upsert({
      where: { userId },
      create: { userId, secret, enrolled: false },
      update: { secret, enrolled: false },
    });

    return { success: true, data: { secret, uri } };
  }

  /**
   * Verify a TOTP token and mark the employee as enrolled.
   */
  async verify(userId: string, token: string) {
    const record = await this.prisma.employeeTotpSecret.findUnique({
      where: { userId },
    });
    if (!record) {
      throw new NotFoundException('TOTP not set up for this user. Call /setup first.');
    }

    const valid = authenticator.check(token, record.secret);
    if (!valid) {
      throw new BadRequestException('Invalid or expired TOTP code');
    }

    if (!record.enrolled) {
      await this.prisma.employeeTotpSecret.update({
        where: { userId },
        data: { enrolled: true },
      });
    }

    return { success: true, enrolled: true };
  }

  /**
   * Check whether an employee has enrolled TOTP.
   */
  async getStatus(userId: string) {
    const record = await this.prisma.employeeTotpSecret.findUnique({
      where: { userId },
    });
    return { enrolled: !!record?.enrolled };
  }
}
