import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';
import type { Response } from 'express';
import { resolveSafeUploadExtension } from '../common/safe-upload-extension';
import { ArticlesService } from '../articles/articles.service';
import { KnowledgeAttachmentsService } from './knowledge-attachments.service';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import {
  ensurePrivateKnowledgeUploadsDir,
  getPrivateKnowledgeUploadsDir,
} from './private-uploads';

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
        // Private dir, outside `./uploads` (served statically at /uploads
        // by main.ts) — D-09/S4.0. A PRIVATE article's attachment must
        // never be reachable by a bare URL; only the `download` route
        // below, which re-checks visibility, can serve it.
        destination: (_req, _file, cb) =>
          cb(null, ensurePrivateKnowledgeUploadsDir()),
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
      // No longer a URL (D-09/S4.0): the private dir isn't served
      // statically, so this stores just the on-disk filename; downloads
      // always go through the `download` route below.
      fileUrl: file.filename,
    });
  }

  /**
   * D-09/S4.0: the only way to fetch a knowledge attachment's bytes.
   * ArticlesService.findOne() applies the exact same visibility rule (and
   * uniform 404) as the rest of the knowledge base — PUBLIC opens to
   * anyone, PRIVATE only to author/ACL/ADMIN — so this route never needs
   * its own copy of that logic, and a PRIVATE article's attachment is
   * never reachable without passing it.
   */
  @Get(':attachmentId/download')
  async download(
    @Param('articleId') articleId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Res() res: Response,
  ) {
    await this.articlesService.findOne(articleId, user);

    const attachment = await this.knowledgeAttachmentsService.findForDownload(
      attachmentId,
      articleId,
    );

    res.download(
      join(getPrivateKnowledgeUploadsDir(), attachment.filename),
      attachment.originalName,
      { headers: { 'Content-Type': attachment.mimeType } },
    );
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
