import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket } from '../../hooks/useTickets';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { EzButton } from '../ds';

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
    const starClass = (star: number) => (star <= currentScore ? 'text-brand-600' : 'text-gray-300');

    // Só leitura: um único elemento com a nota, em vez de cinco botões desabilitados.
    if (!interactive) {
      return (
        <div role="img" aria-label={`Nota ${currentScore} de 5`} className="flex gap-1 text-2xl">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} aria-hidden="true" className={starClass(star)}>
              ★
            </span>
          ))}
        </div>
      );
    }

    return (
      <div role="group" aria-labelledby="csat-score-label" className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Nota ${star} de 5`}
            aria-pressed={star === currentScore}
            className={`${starClass(star)} rounded-control outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-500`}
            onClick={() => setScore(star)}
          >
            <span aria-hidden="true">★</span>
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
      <div className="mt-6 p-4 rounded-lg bg-brand-50 border border-brand-100 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-brand-900 mb-1">Avaliação do Chamado</h3>
          {renderStars(ticket.csatScore as number, false)}
          {ticket.csatComment && (
            <p className="text-sm text-brand-800 mt-2 italic">"{ticket.csatComment}"</p>
          )}
        </div>
        {canRate && (
          <EzButton
            type="button"
            variant="secondary"
            size="small"
            className="mt-4 sm:mt-0"
            onClick={() => {
              setScore(ticket.csatScore || 5);
              setComment(ticket.csatComment || '');
              setIsEditing(true);
            }}
            label="Alterar Nota"
          />
        )}
      </div>
    );
  }

  // Formulário de notas (hasRated && isEditing OU !hasRated && canRate)
  return (
    <div className="mt-6 p-4 rounded-card bg-white border border-gray-100 shadow-card">
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
          <span id="csat-score-label" className="mb-1 block text-sm font-medium">
            Nota
          </span>
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
          <EzButton
            type="submit"
            disabled={mutation.isPending}
            label={mutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
          />

          {hasRated && (
            <EzButton
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => setIsEditing(false)}
              label="Cancelar"
            />
          )}
        </div>
      </form>
    </div>
  );
}
