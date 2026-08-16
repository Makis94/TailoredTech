import { IsUUID, ValidateIf } from 'class-validator';

export class MoveFileDto {
  // Explicit null means "move to the data room's root". The field must
  // always be present so the client's intent is unambiguous.
  @ValidateIf((o) => o.folderId !== null)
  @IsUUID()
  folderId!: string | null;
}
