import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export interface TicketAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileUrl: string;
  createdAt: string;
  uploaderId: string;
  uploader?: { id: string; name: string; email: string };
}

export const attachmentsQueryKey = (ticketId: string) => [
  'tickets',
  ticketId,
  'attachments',
];

function formatBytes(mimeType: string) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/zip') return '🗜️';
  return '📎';
}

interface TicketAttachmentsProps {
  ticketId: string;
}

/**
 * Attachment panel for a ticket: lists uploaded files and lets any
 * authenticated participant (client/agent) upload new ones via a plain
 * file input (works without JS drag-and-drop quirks and is fully
 * keyboard/screen-reader accessible).
 */
export function TicketAttachments({ ticketId }: TicketAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const userId = useAuthStore((state) => state.user?.sub);
  const role = useAuthStore((state) => state.user?.role);
  const canDeleteAny = role === 'ADMIN' || role === 'AGENT_MASTER' || role === 'AGENT';

  const { data: attachments, isLoading } = useQuery<TicketAttachment[]>({
    queryKey: attachmentsQueryKey(ticketId),
    queryFn: async () => {
      const { data } = await api.get<TicketAttachment[]>(
        `/tickets/${ticketId}/attachments`,
      );
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<TicketAttachment>(
        `/tickets/${ticketId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      void queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(ticketId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: attachmentsQueryKey(ticketId),
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Anexos</h2>

      {isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando anexos…
        </p>
      )}

      {attachments && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum anexo neste chamado ainda.
        </p>
      )}

      {attachments && attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
            >
              <a
                href={attachment.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 truncate text-primary hover:underline"
              >
                <span aria-hidden="true">{formatBytes(attachment.mimeType)}</span>
                <span className="truncate">{attachment.originalName}</span>
              </a>
              {(canDeleteAny || attachment.uploaderId === userId) && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  className="shrink-0 text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <label htmlFor="attachment-file" className="sr-only">
          Selecionar arquivo
        </label>
        <input
          id="attachment-file"
          ref={fileInputRef}
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {uploadMutation.isPending ? 'Enviando…' : 'Anexar arquivo'}
        </button>
      </div>

      {uploadMutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Falha ao enviar o anexo. Verifique o tipo e o tamanho do arquivo
          (máx. 10MB).
        </p>
      )}
    </section>
  );
}

export default TicketAttachments;
