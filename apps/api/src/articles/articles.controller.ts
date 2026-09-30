import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../tickets/decorators/current-user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}
  @Get()
  findAll() { return this.articlesService.findAll(); }
  @Post()
  create(@Body() body: any, @CurrentUser() user: any) { return this.articlesService.create(body, user.sub); }
}