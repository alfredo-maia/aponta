import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicKnowledgeService } from './knowledge-public.service';
import { PublicArticleQueryDto } from './dto/public-article-query.dto';

/**
 * No-login public knowledge portal (D-01/D-02, Stage 4/S4.1). Deliberately
 * NOT behind any auth guard, mirroring PublicCsatController — unlike
 * ArticlesController, this controller never reads `request.user` at all,
 * so a caller presenting a JWT/API token (even ADMIN's) changes nothing
 * (AC-02): PublicKnowledgeService fixes visibility=PUBLIC unconditionally.
 * Throttled tighter than the app-wide default (D-05) since it's reachable
 * with no credential at all.
 */
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public/knowledge')
export class PublicKnowledgeController {
  constructor(private readonly publicKnowledgeService: PublicKnowledgeService) {}

  @Get('folders')
  folders() {
    return this.publicKnowledgeService.findAllFolders();
  }

  @Get('articles')
  articles(@Query() query: PublicArticleQueryDto) {
    return this.publicKnowledgeService.findAllArticles(query);
  }

  @Get('articles/:id')
  article(@Param('id') id: string) {
    return this.publicKnowledgeService.findOneArticle(id);
  }
}
