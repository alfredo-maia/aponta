import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../lib/api';

interface PublicCsatSummary {
  protocol: string;
  title: string;
  score: number | null;
  comment: string | null;
}

/**
 * Public, no-login confirmation page reached from the CSAT invitation
 * e-mail (`/avaliar/:token`). Deliberately does NOT submit anything on
 * page load — e-mail clients (Outlook/Gmail) prefetch links automatically,
 * so saving on mount would record a rating nobody actually chose. The
 * score starts pre-selected at 5 stars but is only persisted when the
 * user explicitly clicks "Confirmar avaliação".
 */
export function PublicCsatPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  const { data, isLoading, isError, error } = useQuery<PublicCsatSummary>({
    queryKey: ['public-csat', token],
    queryFn: async () => {
      const res = await api.get(`/public/csat/${token}`);
      return res.data;
    },
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/public/csat/${token}`, {
        score,
        comment: comment || undefined,
      });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando…</p>
      </div>
    );
  }

  if (isError) {
    const isNotFound =
      axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Link inválido
          </h1>
          <p className="text-sm text-gray-500">
            {isNotFound
              ? 'Este link de avaliação é inválido ou já não existe mais.'
              : 'Não foi possível carregar sua avaliação agora. Tente novamente mais tarde.'}
          </p>
        </div>
      </div>
    );
  }

  const alreadyRated = data?.score != null && !mutation.isSuccess;

  const renderStars = (currentScore: number, interactive: boolean) => (
    <div className="flex justify-center gap-2 text-3xl">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          disabled={!interactive}
          onClick={() => interactive && setScore(star)}
          className={`${
            star <= currentScore ? 'text-blue-500' : 'text-gray-300'
          } ${interactive ? 'hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          Chamado {data?.protocol}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{data?.title}</p>

        {mutation.isSuccess ? (
          <p className="text-center text-sm text-green-700 font-medium">
            Obrigado pela sua avaliação!
          </p>
        ) : alreadyRated ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Este chamado já foi avaliado anteriormente:
            </p>
            {renderStars(data?.score ?? 0, false)}
            {data?.comment && (
              <p className="text-sm text-gray-500 mt-3 italic">
                "{data.comment}"
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Como foi sua experiência com nosso atendimento?
            </p>
            {renderStars(score, true)}

            <div>
              <label
                htmlFor="public-csat-comment"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Comentário (opcional)
              </label>
              <textarea
                id="public-csat-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Conte um pouco sobre sua experiência…"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 text-center">
                Falha ao enviar sua avaliação. Tente novamente.
              </p>
            )}

            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Enviando…' : 'Confirmar avaliação'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
