import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EzAlert, EzSpinner, EzTag } from '../ds';

export interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  ticketId: string;
  authorId: string;
  createdAt: string;
}

export const commentsQueryKey = (ticketId: string) =>
  ['tickets', ticketId, 'comments'] as const;

/** Same UTC-stable rendering as TicketDetail's deadline formatter. */
function formatTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

interface TicketCommentsProps {
  ticketId: string;
}

/**
 * Comment timeline for a ticket. The server already scopes visibility —
 * CLIENT callers never receive `isInternal: true` comments (Task 6) — so no
 * client-side filtering is applied: everything the API returns is rendered,
 * and internal notes simply get an "Internal note" badge.
 */
export function TicketComments({ ticketId }: TicketCommentsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: commentsQueryKey(ticketId),
    queryFn: async () => {
      const { data } = await api.get<TicketComment[]>(
        `/tickets/${ticketId}/comments`,
      );
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <EzSpinner label="Carregando comentários…" />
      </div>
    );
  }

  if (isError) {
    return (
      <EzAlert variant="error" role="alert">
        Falha ao carregar os comentários. Tente novamente.
      </EzAlert>
    );
  }

  const comments = data ?? [];
  if (comments.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum comentário ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="space-y-2 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isInternal && (
              <EzTag label="Nota interna" variant="petroleum" />
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-900">
            {comment.content}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default TicketComments;
