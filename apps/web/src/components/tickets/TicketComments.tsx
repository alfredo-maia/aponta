import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

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
      <p role="status" className="text-sm text-muted-foreground">
        Carregando comentários…
      </p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Falha ao carregar os comentários. Tente novamente.
      </p>
    );
  }

  const comments = data ?? [];
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="space-y-2 rounded-lg border bg-background p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isInternal && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                Nota interna
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        </li>
      ))}
    </ul>
  );
}

export default TicketComments;
