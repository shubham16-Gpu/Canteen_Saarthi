import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, VendorFormStatus } from '@prisma/client';

export interface CreateCategoryDto {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface CreateFieldDto {
  categoryId: string;
  key: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: unknown;
  validation?: unknown;
  uiHints?: unknown;
  required?: boolean;
  visibleToVendor?: boolean;
  visibleToAdmin?: boolean;
  visibleToSuper?: boolean;
  editableByVendor?: boolean;
  requiresApproval?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  maskData?: boolean;
  encryptionRequired?: boolean;
  displayOrder?: number;
  metadata?: unknown;
}

export interface SubmitFormValuesDto {
  vendorId: string;
  values: Record<string, unknown>;
  formVersionId?: string;
  updatedBy?: string;
}

@Injectable()
export class VendorFormService {
  private readonly logger = new Logger(VendorFormService.name);
  private readonly prisma = new PrismaClient();

  // ─── Schema (published form) ─────────────────────────────────────────────

  async getPublishedSchema() {
    const version = await this.prisma.vendorFormVersion.findFirst({
      where: { status: VendorFormStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
    });

    const categories = await this.prisma.vendorFormCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return { version, categories };
  }

  // ─── Category CRUD ────────────────────────────────────────────────────────

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.vendorFormCategory.create({ data: dto });
  }

  async listCategories() {
    return this.prisma.vendorFormCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        fields: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  // ─── Field CRUD ───────────────────────────────────────────────────────────

  async createField(dto: CreateFieldDto) {
    return this.prisma.vendorFormField.create({
      data: {
        categoryId: dto.categoryId,
        key: dto.key,
        label: dto.label,
        fieldType: dto.fieldType,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        defaultValue: dto.defaultValue !== undefined ? (dto.defaultValue as object) : undefined,
        options: dto.options !== undefined ? (dto.options as object) : undefined,
        validation: dto.validation !== undefined ? (dto.validation as object) : undefined,
        uiHints: dto.uiHints !== undefined ? (dto.uiHints as object) : undefined,
        required: dto.required ?? false,
        visibleToVendor: dto.visibleToVendor ?? true,
        visibleToAdmin: dto.visibleToAdmin ?? true,
        visibleToSuper: dto.visibleToSuper ?? true,
        editableByVendor: dto.editableByVendor ?? true,
        requiresApproval: dto.requiresApproval ?? false,
        searchable: dto.searchable ?? false,
        filterable: dto.filterable ?? false,
        maskData: dto.maskData ?? false,
        encryptionRequired: dto.encryptionRequired ?? false,
        displayOrder: dto.displayOrder ?? 0,
        metadata: dto.metadata !== undefined ? (dto.metadata as object) : undefined,
      },
    });
  }

  // ─── Version management ───────────────────────────────────────────────────

  async publishVersion(opts: {
    versionNumber: string;
    changeSummary?: string;
    publishedBy: string;
  }) {
    // Archive previous published versions
    await this.prisma.vendorFormVersion.updateMany({
      where: { status: VendorFormStatus.PUBLISHED },
      data: { status: VendorFormStatus.ARCHIVED, archivedAt: new Date() },
    });

    // Snapshot current active categories+fields
    const categories = await this.listCategories();

    return this.prisma.vendorFormVersion.create({
      data: {
        versionNumber: opts.versionNumber,
        status: VendorFormStatus.PUBLISHED,
        snapshot: categories as object,
        changeSummary: opts.changeSummary,
        publishedAt: new Date(),
        publishedBy: opts.publishedBy,
      },
    });
  }

  async listVersions() {
    return this.prisma.vendorFormVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Vendor field values ──────────────────────────────────────────────────

  async submitValues(dto: SubmitFormValuesDto) {
    const upserts = Object.entries(dto.values).map(([fieldKey, fieldValue]) =>
      this.prisma.vendorFieldValue.upsert({
        where: { vendorId_fieldKey: { vendorId: dto.vendorId, fieldKey } },
        create: {
          vendorId: dto.vendorId,
          fieldKey,
          fieldValue: fieldValue as object,
          formVersionId: dto.formVersionId,
          updatedBy: dto.updatedBy,
          approvalStatus: 'PENDING',
        },
        update: {
          fieldValue: fieldValue as object,
          formVersionId: dto.formVersionId,
          updatedBy: dto.updatedBy,
          approvalStatus: 'PENDING',
        },
      }),
    );

    const results = await Promise.all(upserts);
    return { saved: results.length, vendorId: dto.vendorId };
  }

  async getVendorValues(vendorId: string) {
    const values = await this.prisma.vendorFieldValue.findMany({
      where: { vendorId },
      orderBy: { fieldKey: 'asc' },
    });
    if (!values.length) {
      // Still return empty result — not 404, vendor just hasn't submitted yet.
      return { vendorId, values: [] };
    }
    return { vendorId, values };
  }
}
