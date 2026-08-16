import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Disallow path separators and control characters — names are display labels,
// never filesystem paths, and this also keeps storage keys predictable.
const SAFE_NAME_PATTERN = /^[^/\\\x00-\x1f]+$/;

export class UpdateNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(SAFE_NAME_PATTERN, {
    message: 'Name cannot contain "/", "\\\\", or control characters',
  })
  name!: string;
}
