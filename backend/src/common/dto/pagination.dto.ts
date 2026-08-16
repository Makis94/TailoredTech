import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;

  // Declared here (rather than only as a separate @Query('shareToken') param)
  // because the global ValidationPipe's forbidNonWhitelisted rejects the
  // whole query object — including this key — if PaginationDto doesn't know
  // about it, on the "contents" routes that accept both.
  @IsOptional()
  @IsString()
  shareToken?: string;

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
