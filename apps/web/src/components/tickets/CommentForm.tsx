import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { TicketComment } from './TicketComments';
import { commentsQueryKey } from './TicketComments';

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comentário é obrigatório'),
  isInternal: z.boolean(),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  ticketId: string;
}

/**
 * New-comment form for the ticket timeline. The "Internal note" checkbox is
 * shown to AGENT and ADMIN only — matching the server-side permission model
 * (Task 6 forces `isInternal: false` for CLIENT callers anyway, so this is a
 * UX affordance, not the security boundary). On success the comments query is
 * invalidated so the timeline refetches and shows the new comment.
 */
export function CommentForm({ ticketId }: CommentFormProps) {
  const role = useAuthStore((state) => state.user?.role);
  const canMarkInternal = ['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(role as string);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '', isInternal: false },
  });

  const mutation = useMutation({
    mutationFn: async (values: CommentFormValues) => {
      const { data } = await api.post<TicketComment>(
        `/tickets/${ticketId}/comments`,
        {
          content: values.content,
          isInternal: canMarkInternal ? values.isInternal : false,
        },
      );
      return data;
    },
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({
        queryKey: commentsQueryKey(ticketId),
      });
    },
  });

  const onSubmit = (values: CommentFormValues) => {
    mutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="space-y-1">
        <label htmlFor="comment-content" className="block text-sm font-medium">
          Adicionar um comentário
        </label>
        <textarea
          id="comment-content"
          rows={3}
          className="w-full rounded border px-3 py-2"
          {...register('content')}
        />
        {errors.content && (
          <p className="text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      {canMarkInternal && (
        <div className="flex items-center gap-2">
          <input
            id="comment-is-internal"
            type="checkbox"
            {...register('isInternal')}
          />
          <label htmlFor="comment-is-internal" className="text-sm">
            Nota interna
          </label>
        </div>
      )}

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Falha ao publicar o comentário. Tente novamente.
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        Publicar comentário
      </button>
    </form>
  );
}

export default CommentForm;
