import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket } from '../../hooks/useTickets';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface TicketCsatProps {
  ticket: Ticket;
}

export function TicketCsat({ ticket }: TicketCsatProps) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [score, setScore] = useState<number>(ticket.csatScore || 5);
  const [comment, setComment] = useState(ticket.csatComment || '');
  const [isEditing, setIsEditing] = useState(false);

  const isRequester = user?.sub === ticket.requesterId;
  const canRate = isRequester && ticket.status === 'RESOLVED';
  const hasRated = ticket.csatScore != null;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { score, comment };
      const res = await api.patch(`/tickets/${ticket.id}/csat`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
      setIsEditing(false);
    },
  });

  const renderStars = (currentScore: number, interactive = false) => {
    return (
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${
              star <= currentScore ? 'text-blue-500' : 'text-gray-300'
            } ${interactive ? 'hover:scale-110 transition-transform' : 'cursor-default'}`}
            onClick={() => {
              if (interactive) setScore(star);
            }}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // Nao foi avaliado ainda e nao pode ser
  if (!hasRated && !canRate) {
    return null; 
  }

  // Visualizacao da nota dada
  if (hasRated && !isEditing) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Avaliação do Chamado</h3>
          {renderStars(ticket.csatScore as number, false)}
          {ticket.csatComment && (
            <p className="text-sm text-blue-800 mt-2 italic">"{ticket.csatComment}"</p>
          )}
        </div>
        {canRate && (
          <button
            onClick={() => {
              setScore(ticket.csatScore || 5);
              setComment(ticket.csatComment || '');
              setIsEditing(true);
            }}
            className="mt-4 sm:mt-0 text-sm px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          >
            Alterar Nota
          </button>
        )}
      </div>
    );
  }

  // Formulário de notas (hasRated && isEditing OU !hasRated && canRate)
  return (
    <div className="mt-6 p-4 rounded-lg bg-white border shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Avalie nosso atendimento</h3>
      <p className="text-sm text-gray-500 mb-4">
        Seu chamado foi resolvido! Gostaríamos muito de saber como foi a sua experiência.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Nota</label>
          {renderStars(score, true)}
        </div>

        <div>
          <label htmlFor="csat-comment" className="block text-sm font-medium mb-1">
            Comentário (opcional)
          </label>
          <textarea
            id="csat-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            placeholder="Deixe um comentário contando o que achou..."
            maxLength={1000}
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">Falha ao salvar avaliação.</p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
          
          {hasRated && (
             <button
               type="button"
               disabled={mutation.isPending}
               onClick={() => setIsEditing(false)}
               className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
             >
               Cancelar
             </button>
          )}
        </div>
      </form>
    </div>
  );
}
