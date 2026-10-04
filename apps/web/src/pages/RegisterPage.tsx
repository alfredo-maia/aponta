import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { EzAlert, EzButton, EzCardItem, EzTextInput } from '../components/ds';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-80 text-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm">
        <EzCardItem className="space-y-4 p-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Criar conta</h1>

          <EzTextInput
            id="name"
            label="Nome"
            type="text"
            autoComplete="name"
            hasError={!!errors.name}
            message={errors.name?.message}
            {...register('name')}
          />

          <EzTextInput
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            hasError={!!errors.email}
            message={errors.email?.message}
            {...register('email')}
          />

          <EzTextInput
            id="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            hasError={!!errors.password}
            message={errors.password?.message}
            {...register('password')}
          />

          {submitError && <EzAlert variant="error">{submitError}</EzAlert>}

          {registeredButLoginFailed && (
            <EzAlert variant="error">
              Conta criada com sucesso! Houve um problema ao fazer login
              automaticamente — por favor{' '}
              <Link to="/login" className="underline">
                entre com sua conta
              </Link>
              .
            </EzAlert>
          )}

          <EzButton type="submit" disabled={isSubmitting} className="w-full">
            Criar conta
          </EzButton>
        </EzCardItem>
      </form>
    </div>
  );
}

export default RegisterPage;
