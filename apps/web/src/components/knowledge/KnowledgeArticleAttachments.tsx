import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EzAlert, EzButton } from '../ds';

export interface KnowledgeAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  fileUrl: string;
  createdAt: string;
}

interface KnowledgeArticleAttachmentsProps {
  articleId: string;
  /** Already loaded by the parent's `['articles', ...]` query — this
   * component never fetches attachments itself. */
  attachments: KnowledgeAttachment[];
  /** AGENT/AGENT_MASTER/ADMIN only (same `canAuthor` rule as KnowledgePage):
   * shows the upload/remove affordances. Everyone who can see the article
   * can still see and download its attachments. */
  canManage: boolean;
}

function formatIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/zip') return '🗜️';
  return '📎';
}

/**
 * Attachment panel for a knowledge base article: lists uploaded files and,
 * for authors, lets them upload new ones or remove existing ones. Mirrors
 * TicketAttachments.tsx, but attachments come from the article payload
 * already fetched by KnowledgePage (no separate GET here) and the backend
 * limit is 25MB (vs. 10MB for ticket attachments).
 */
export function KnowledgeArticleAttachments({
  articleId,
  attachments,
  canManage,
}: KnowledgeArticleAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputId = `knowledge-attachment-file-${articleId}`;

  const invalidateArticles = () =>
    queryClient.invalidateQueries({ queryKey: ['articles'], exact: false });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/articles/${articleId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      void invalidateArticles();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/articles/${articleId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      void invalidateArticles();
    },
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-900">
        Anexos ({attachments.length})
      </h3>

      {attachments.length === 0 && (
        <p className="text-sm text-gray-500">Nenhum anexo neste artigo ainda.</p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <a
                href={attachment.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 truncate text-brand-600 hover:underline"
              >
                <span aria-hidden="true">{formatIcon(attachment.mimeType)}</span>
                <span className="truncate">{attachment.originalName}</span>
              </a>
              {canManage && (
                <EzButton
                  type="button"
                  variant="tertiary"
                  size="small"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  className="!text-red-600 hover:!text-red-700"
                >
                  Remover
                </EzButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-80"
          >
            Selecionar arquivo
          </label>
          <span className="truncate text-sm text-gray-500">
            {selectedFile ? selectedFile.name : 'Nenhum arquivo selecionado'}
          </span>
          <EzButton
            type="button"
            size="small"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Enviando…' : 'Anexar arquivo'}
          </EzButton>
        </div>
      )}

      {uploadMutation.isError && (
        <EzAlert variant="error" role="alert">
          Falha ao enviar o anexo. Verifique o tipo e o tamanho do arquivo
          (máx. 25MB).
        </EzAlert>
      )}
    </section>
  );
}

export default KnowledgeArticleAttachments;
