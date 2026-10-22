import {
  Controller,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { resolveSafeUploadExtension } from '../common/safe-upload-extension';
import { ArticlesService } from '../articles/articles.service';
import { KnowledgeAttachmentsService } from './knowledge-attachments.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

interface AuthenticatedRequest {
  user: CurrentUserPayload;
}

// 25MB — TiFlux knowledge-panel parity. Deliberately higher than tickets'
// 10MB (apps/api/src/tickets/attachments.controller.ts); that limit is
// untouched by this change.
const MAX_FILE_SIZE = 25 * 1024 * 1024;
// Same allowlist as tickets/attachments.controller.ts — "same pattern" per
// the issue, not a new list.
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Mirrors ArticlesController's guard shape (see the comment there and on
 * KnowledgeFoldersController): class-level OptionalJwtOrTokenAuthGuard
 * populates request.user without ever rejecting, so PermissionsGuard on
 * the write handlers below can actually see a user to check.
 */
@UseGuards(OptionalJwtOrTokenAuthGuard)
@Controller('articles/:articleId/attachments')
export class KnowledgeAttachmentsController {
  constructor(
    private readonly knowledgeAttachmentsService: KnowledgeAttachmentsService,
    private readonly articlesService: ArticlesService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_KNOWLEDGE_BASE')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        // Extension is derived ONLY from the already-allowlisted MIME
        // type, never from the client-supplied `originalname` — see
        // safe-upload-extension.ts for why that matters.
        filename: (_req, file, cb) => {
          const unique = randomUUID();
          cb(null, `${unique}${resolveSafeUploadExtension(file.mimetype)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              `Tipo de arquivo não permitido: ${file.mimetype}`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Param('articleId') articleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const article = await this.articlesService.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    return this.knowledgeAttachmentsService.create({
      articleId,
      uploaderId: req.user.id,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileUrl: `/uploads/${file.filename}`,
    });
  }

  @Delete(':attachmentId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('MANAGE_KNOWLEDGE_BASE')
  async remove(
    @Param('articleId') articleId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const article = await this.articlesService.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    return this.knowledgeAttachmentsService.remove(attachmentId, req.user);
  }
}
