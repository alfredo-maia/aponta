import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { CreateArticleDto } from './dto/create-article.dto';

@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.articlesService.findAll(user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.AGENT, Role.AGENT_MASTER, Role.ADMIN)
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.create(dto, user);
  }
}