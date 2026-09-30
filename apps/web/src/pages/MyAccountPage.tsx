import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function MyAccountPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setSubmitError(null);
    setSuccess(false);

    try {
      await api.post('/auth/change-password', values);
      setSuccess(true);
      reset();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setSubmitError('Senha atual incorreta.');
      } else {
        setSubmitError('Algo deu errado. Tente novamente.');
      }
    }
  };

  return (
    <div className="mx-auto max-w-sm space-y-6 p-6">
      <h1 className="text-2xl font-bold">Minha Conta</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 rounded-lg border p-6"
      >
        <h2 className="text-lg font-semibold">Trocar senha</h2>

        <div className="space-y-1">
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium"
          >
            Senha atual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border px-3 py-2"
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-600">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="newPassword" className="block text-sm font-medium">
            Nova senha
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded border px-3 py-2"
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-600">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-green-600">
            Senha atualizada com sucesso!
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Trocar senha
        </button>
      </form>
    </div>
  );
}

export default MyAccountPage;
