import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ShareMode, ShareResourceType } from '@prisma/client';

export class CreateShareDto {
  @IsEnum(ShareResourceType)
  resourceType!: ShareResourceType;

  @IsUUID()
  resourceId!: string;

  @IsEnum(ShareMode)
  mode!: ShareMode;

  // Required (and non-empty) only for PERMISSIONED shares; ignored for PUBLIC ones.
  @ValidateIf((o) => o.mode === 'PERMISSIONED')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  emails?: string[];
}
