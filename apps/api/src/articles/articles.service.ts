import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.article.findMany({ orderBy: { createdAt: 'desc' } }); }
  create(data: any, authorId: string) { return this.prisma.article.create({ data: { ...data, authorId } }); }
}