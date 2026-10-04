import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { TicketComment } from './TicketComments';
import { commentsQueryKey } from './TicketComments';
import { EzAlert, EzButton, EzCheck, EzTextArea } from '../ds';

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
    watch,
    setValue,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '', isInternal: false },
  });

  const isInternal = watch('isInternal');

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
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <EzTextArea
        id="comment-content"
        label="Adicionar um comentário"
        rows={3}
        hasError={!!errors.content}
        message={errors.content?.message}
        {...register('content')}
      />

      {canMarkInternal && (
        <EzCheck
          id="comment-is-internal"
          label="Nota interna"
          checked={isInternal}
          onChange={(e) => setValue('isInternal', e.target.checked)}
        />
      )}

      {mutation.isError && (
        <EzAlert variant="error" role="alert">
          Falha ao publicar o comentário. Tente novamente.
        </EzAlert>
      )}

      <EzButton type="submit" disabled={mutation.isPending}>
        Publicar comentário
      </EzButton>
    </form>
  );
}

export default CommentForm;
