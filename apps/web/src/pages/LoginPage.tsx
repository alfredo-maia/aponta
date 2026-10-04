import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { EzAlert, EzButton, EzCardItem, EzTextInput } from '../components/ds';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      const { data } = await api.post<{ access_token: string }>(
        '/auth/login',
        values,
      );
      login(data.access_token);
      navigate('/');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setSubmitError('E-mail ou senha inválidos.');
      } else {
        setSubmitError('Algo deu errado. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-80 text-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm">
        <EzCardItem className="space-y-4 p-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Entrar</h1>

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
            autoComplete="current-password"
            hasError={!!errors.password}
            message={errors.password?.message}
            {...register('password')}
          />

          {submitError && <EzAlert variant="error">{submitError}</EzAlert>}

          <EzButton type="submit" disabled={isSubmitting} className="w-full">
            Entrar
          </EzButton>
        </EzCardItem>
      </form>
    </div>
  );
}

export default LoginPage;
