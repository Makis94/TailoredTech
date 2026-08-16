import { IsOptional, IsUUID } from 'class-validator';

export class UploadFileDto {
  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
