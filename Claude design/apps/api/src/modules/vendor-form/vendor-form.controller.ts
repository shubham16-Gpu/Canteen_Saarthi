import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  VendorFormService,
  CreateCategoryDto,
  CreateFieldDto,
  SubmitFormValuesDto,
} from './vendor-form.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators';
import { Public } from '../../common/decorators';

@ApiTags('vendor-form')
@Controller('vendor-form')
export class VendorFormController {
  constructor(private readonly vendorFormService: VendorFormService) {}

  /**
   * GET /vendor-form/schema
   * Public — returns the published vendor profile form schema.
   */
  @Public()
  @Get('schema')
  @ApiOperation({ summary: 'Get published vendor form schema' })
  @ApiResponse({ status: 200, description: 'Published form schema' })
  async getSchema() {
    const data = await this.vendorFormService.getPublishedSchema();
    return { success: true, data };
  }

  /**
   * GET /vendor-form/versions
   * List form versions. Restricted to ADMIN / SUPER_ADMIN.
   */
  @UseGuards(JwtAuthGuard)
  @Get('versions')
  @ApiOperation({ summary: 'List form versions (SA/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Form versions' })
  async listVersions(@CurrentUser() user: RequestUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Access restricted to SUPER_ADMIN and ADMIN');
    }
    const data = await this.vendorFormService.listVersions();
    return { success: true, data };
  }

  /**
   * POST /vendor-form/category
   * Create a new form category. Restricted to SUPER_ADMIN.
   */
  @UseGuards(JwtAuthGuard)
  @Post('category')
  @ApiOperation({ summary: 'Create form category (SUPER_ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['key', 'label'],
      properties: {
        key: { type: 'string', example: 'basic_info' },
        label: { type: 'string', example: 'Basic Information' },
        description: { type: 'string' },
        icon: { type: 'string' },
        displayOrder: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoryDto,
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to SUPER_ADMIN');
    }
    const data = await this.vendorFormService.createCategory(dto);
    return { success: true, data };
  }

  /**
   * POST /vendor-form/field
   * Create a new form field. Restricted to SUPER_ADMIN.
   */
  @UseGuards(JwtAuthGuard)
  @Post('field')
  @ApiOperation({ summary: 'Create form field (SUPER_ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['categoryId', 'key', 'label', 'fieldType'],
      properties: {
        categoryId: { type: 'string' },
        key: { type: 'string', example: 'gst_number' },
        label: { type: 'string', example: 'GST Number' },
        fieldType: { type: 'string', example: 'text' },
        required: { type: 'boolean' },
        visibleToVendor: { type: 'boolean' },
        editableByVendor: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Field created' })
  async createField(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFieldDto,
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to SUPER_ADMIN');
    }
    const data = await this.vendorFormService.createField(dto);
    return { success: true, data };
  }

  /**
   * POST /vendor-form/publish
   * Publish a new form version snapshot. Restricted to SUPER_ADMIN.
   */
  @UseGuards(JwtAuthGuard)
  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish new form version (SUPER_ADMIN)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['versionNumber'],
      properties: {
        versionNumber: { type: 'string', example: '1.0.0' },
        changeSummary: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Version published' })
  async publish(
    @CurrentUser() user: RequestUser,
    @Body() body: { versionNumber: string; changeSummary?: string },
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access restricted to SUPER_ADMIN');
    }
    const data = await this.vendorFormService.publishVersion({
      versionNumber: body.versionNumber,
      changeSummary: body.changeSummary,
      publishedBy: user.id,
    });
    return { success: true, data };
  }

  /**
   * POST /vendor-form/submit
   * Vendor submits their form values.
   */
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit vendor form values' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['values'],
      properties: {
        values: {
          type: 'object',
          additionalProperties: true,
          example: { gst_number: '27AAAAA0000A1Z5', pan_number: 'AAAAA0000A' },
        },
        formVersionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Values saved' })
  async submit(
    @CurrentUser() user: RequestUser,
    @Body() body: { values: Record<string, unknown>; formVersionId?: string },
  ) {
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only vendors can submit form values');
    }
    const dto: SubmitFormValuesDto = {
      vendorId: user.id,
      values: body.values,
      formVersionId: body.formVersionId,
      updatedBy: user.id,
    };
    const data = await this.vendorFormService.submitValues(dto);
    return { success: true, data };
  }

  /**
   * GET /vendor-form/values/:vendorId
   * Get a vendor's submitted field values. ADMIN/SA can read any vendor.
   */
  @UseGuards(JwtAuthGuard)
  @Get('values/:vendorId')
  @ApiOperation({ summary: 'Get vendor submitted form values' })
  @ApiResponse({ status: 200, description: 'Vendor field values' })
  async getValues(
    @CurrentUser() user: RequestUser,
    @Param('vendorId') vendorId: string,
  ) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isOwner = user.id === vendorId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Access restricted to the vendor owner or admins');
    }

    const data = await this.vendorFormService.getVendorValues(vendorId);
    return { success: true, data };
  }
}
