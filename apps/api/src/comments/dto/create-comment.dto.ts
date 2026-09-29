import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Fields a caller may set when creating a comment. `isInternal` is accepted
 * in the body so AGENT/ADMIN callers can file internal notes, but it is
 * NEVER honored for CLIENT callers — CommentsService.create forces it to
 * `false` server-side when the caller's role is CLIENT, regardless of what
 * the client sends. This mirrors the server-derived-fields discipline from
 * CreateTicketDto (protocol/status/requesterId) and avoids the
 * privilege-escalation pattern of trusting a client-supplied flag.
 */
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
