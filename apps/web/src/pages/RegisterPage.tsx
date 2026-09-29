import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    try {
      await api.post('/auth/register', values);
      const { data } = await api.post<{ access_token: string }>(
        '/auth/login',
        { email: values.email, password: values.password },
      );
      login(data.access_token);
      navigate('/');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSubmitError('An account with this email already exists.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-2xl font-bold">Create account</h1>

        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm font-medium">
            Name
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
            Email
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
            Password
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Create account
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;
