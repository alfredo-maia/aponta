import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

/**
 * No `role` field here by design: the API's RegisterDto deliberately omits
 * it (POST /api/auth/register always assigns Role.CLIENT server-side) as a
 * security hardening measure — do not add a role selector to this form.
 */
const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredButLoginFailed, setRegisteredButLoginFailed] =
    useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    setRegisteredButLoginFailed(false);

    try {
      await api.post('/auth/register', values);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSubmitError('Já existe uma conta com este e-mail.');
      } else {
        setSubmitError('Algo deu errado. Tente novamente.');
      }
      return;
    }

    // Registration succeeded — the account genuinely exists from here on,
    // regardless of what happens next. Any failure below must not be
    // reported using the same "registration failed" messaging.
    try {
      const { data } = await api.post<{ access_token: string }>(
        '/auth/login',
        { email: values.email, password: values.password },
      );
      login(data.access_token);
      navigate('/');
    } catch {
      setRegisteredButLoginFailed(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-2xl font-bold">Criar conta</h1>

        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="w-full rounded border px-3 py-2"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded border px-3 py-2"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded border px-3 py-2"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        {registeredButLoginFailed && (
          <p role="alert" className="text-sm text-red-600">
            Conta criada com sucesso! Houve um problema ao fazer login
            automaticamente — por favor{' '}
            <Link to="/login" className="underline">
              entre com sua conta
            </Link>
            .
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Criar conta
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;
