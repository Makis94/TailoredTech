import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SAFE_NAME_PATTERN = /^[^/\\\x00-\x1f]+$/;

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(SAFE_NAME_PATTERN, {
    message: 'Name cannot contain "/", "\\\\", or control characters',
  })
  name!: string;

  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
