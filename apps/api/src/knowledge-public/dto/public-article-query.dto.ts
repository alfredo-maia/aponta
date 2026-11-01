import { IsOptional, IsString } from 'class-validator';

/**
 * AC-03: the global ValidationPipe (`whitelist`/`forbidNonWhitelisted`,
 * see main.ts) rejects any query param not declared here with a 400 —
 * `visibility`, `isPublic`, `where`, etc. can never reach the service,
 * regardless of what PublicKnowledgeService itself would do with them.
 */
export class PublicArticleQueryDto {
  @IsOptional()
  @IsString()
  folderId?: string;
}
