import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class MultiAuthDto {
  @ApiProperty({ example: 'credential', enum: ['credential', 'otp', 'authenticator', 'vendor-credential', 'vendor-otp', 'email-otp', 'google'] })
  @IsString()
  @IsNotEmpty()
  step!: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'superadmin', 'vendor', 'employee', 'customer'], required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ example: 'admin@canteen.app', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'supersecret', required: false })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @IsOptional()
  otp?: string;

  @ApiProperty({ example: '654321', required: false })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiProperty({ example: 'admin@canteen.app', required: false })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiProperty({ example: 'VEND001', required: false })
  @IsString()
  @IsOptional()
  vendorCode?: string;

  @ApiProperty({ example: '9876543210', required: false })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiProperty({ example: 'google-id-token-here', required: false })
  @IsString()
  @IsOptional()
  credential?: string;
}
