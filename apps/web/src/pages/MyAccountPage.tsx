import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useApiTokens } from '../hooks/useApiTokens';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
});
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('E-mail inválido'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

type Tab = 'profile' | 'security' | 'tokens';

/**
 * Mirrors the Tiflux reference UI (accessed 2026-09-30): "Minha conta"
 * opens a tabbed page — a "Minha conta" tab for profile fields (name,
 * email, ...) and a "Segurança" tab holding the change-password form.
 * Only name/email are implemented here; photo/phone/language etc. from
 * the reference are out of scope for now.
 *
 * "Tokens de API" is Aponta-specific (no Tiflux equivalent): lets ANY
 * role mint a personal Bearer token (scoped to their own current
 * role/organization, enforced server-side) to drive the REST API from
 * outside the browser — e.g. the apps/mcp MCP server for LLM clients.
 */
export function MyAccountPage() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="mx-auto max-w-sm space-y-6 p-6">
      <h1 className="text-2xl font-bold">Minha Conta</h1>

      <div role="tablist" className="flex gap-2 border-b">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'profile'}
          onClick={() => setTab('profile')}
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'profile'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Minha Conta
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'security'}
          onClick={() => setTab('security')}
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'security'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Segurança
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tokens'}
          onClick={() => setTab('tokens')}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
            tab === 'tokens'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Tokens de API
        </button>
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'tokens' && <ApiTokensTab />}
    </div>
  );
}

function ProfileTab() {
  const user = useAuthStore((state) => state.user);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: user?.email ?? '' },
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ name: string; email: string }>('/auth/me')
      .then((response) => {
        if (!cancelled) {
          reset({ name: response.data.name, email: response.data.email });
        }
      })
      .catch(() => {
        // Keep the defaults (blank name / token email) if the fetch fails;
        // the user can still edit and save.
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError(null);
    setSuccess(false);
    try {
      await api.patch('/auth/me', values);
      setSuccess(true);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSubmitError('Esse e-mail já está em uso por outra conta.');
      } else {
        setSubmitError('Algo deu errado. Tente novamente.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-lg border p-6"
    >
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium">
          Nome
        </label>
        <input
          id="name"
          type="text"
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
          className="w-full rounded border px-3 py-2"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-600">
          Dados atualizados com sucesso!
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}

function SecurityTab() {
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-lg border p-6"
    >
      <h2 className="text-lg font-semibold">Alterar senha</h2>

      <div className="space-y-1">
        <label htmlFor="currentPassword" className="block text-sm font-medium">
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
          <p className="text-sm text-red-600">{errors.newPassword.message}</p>
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
  );
}

export default MyAccountPage;

function ApiTokensTab() {
  const { listQuery, createMutation, revokeMutation } = useApiTokens();
  const [name, setName] = useState('');
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const created = await createMutation.mutateAsync(name.trim());
    setJustCreatedToken(created.token);
    setCopied(false);
    setName('');
  };

  const handleCopy = () => {
    if (justCreatedToken) {
      navigator.clipboard.writeText(justCreatedToken);
      setCopied(true);
    }
  };

  const handleRevoke = (id: string) => {
    if (window.confirm('Revogar este token? Qualquer integração usando-o perderá acesso imediatamente.')) {
      revokeMutation.mutate(id);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca usado';
    return new Date(iso).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <div>
        <h2 className="text-lg font-semibold">Tokens de API</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gere um token pessoal para integrações externas (ex: servidor MCP para IAs).
          O token herda exatamente o mesmo nível de acesso da sua conta.
        </p>
      </div>

      {justCreatedToken && (
        <div className="rounded border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">
            Copie seu token agora — ele não será exibido novamente!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 text-xs border">
              {justCreatedToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setJustCreatedToken(null)}
            className="text-xs text-amber-700 hover:underline"
          >
            Entendi, fechar
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="token-name" className="block text-sm font-medium">
            Nome do token
          </label>
          <input
            id="token-name"
            type="text"
            placeholder="Ex: Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 whitespace-nowrap"
        >
          Gerar Token
        </button>
      </form>

      <div className="space-y-2">
        {listQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!listQuery.isLoading && listQuery.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum token criado ainda.</p>
        )}
        {listQuery.data?.map((token) => (
          <div key={token.id} className="flex items-center justify-between rounded border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{token.name}</p>
              <p className="text-xs text-muted-foreground">
                Criado em {formatDate(token.createdAt)} · Último uso: {formatDate(token.lastUsedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRevoke(token.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Revogar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
