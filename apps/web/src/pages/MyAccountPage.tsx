import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useApiTokens } from '../hooks/useApiTokens';
import { EzAlert, EzButton, EzTabs, EzTextInput } from '../components/ds';

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

  const tabs = [
    { id: 'profile', label: 'Minha Conta' },
    { id: 'security', label: 'Segurança' },
    { id: 'tokens', label: 'Tokens de API' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>

      <EzTabs
        tabs={tabs}
        activeTab={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      <div className="pt-2">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'tokens' && <ApiTokensTab />}
      </div>
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
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <EzTextInput
        id="name"
        label="Nome"
        hasError={!!errors.name}
        message={errors.name?.message}
        {...register('name')}
      />

      <EzTextInput
        id="email"
        type="email"
        label="E-mail"
        hasError={!!errors.email}
        message={errors.email?.message}
        {...register('email')}
      />

      {submitError && (
        <EzAlert variant="error" role="alert">
          {submitError}
        </EzAlert>
      )}
      {success && (
        <EzAlert variant="success" role="status">
          Dados atualizados com sucesso!
        </EzAlert>
      )}

      <EzButton type="submit" disabled={isSubmitting} className="w-full">
        Salvar
      </EzButton>
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
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900">Alterar senha</h2>

      <EzTextInput
        id="currentPassword"
        type="password"
        autoComplete="current-password"
        label="Senha atual"
        hasError={!!errors.currentPassword}
        message={errors.currentPassword?.message}
        {...register('currentPassword')}
      />

      <EzTextInput
        id="newPassword"
        type="password"
        autoComplete="new-password"
        label="Nova senha"
        hasError={!!errors.newPassword}
        message={errors.newPassword?.message}
        {...register('newPassword')}
      />

      {submitError && (
        <EzAlert variant="error" role="alert">
          {submitError}
        </EzAlert>
      )}
      {success && (
        <EzAlert variant="success" role="status">
          Senha atualizada com sucesso!
        </EzAlert>
      )}

      <EzButton type="submit" disabled={isSubmitting} className="w-full">
        Trocar senha
      </EzButton>
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
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Tokens de API</h2>
        <p className="mt-1 text-sm text-gray-500">
          Gere um token pessoal para integrações externas (ex: servidor MCP para IAs).
          O token herda exatamente o mesmo nível de acesso da sua conta.
        </p>
      </div>

      {justCreatedToken && (
        <div className="space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Copie seu token agora — ele não será exibido novamente!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border border-gray-200 bg-white px-2 py-1 text-xs">
              {justCreatedToken}
            </code>
            <EzButton
              type="button"
              size="small"
              onClick={handleCopy}
              className="!bg-amber-600 !border-amber-600 hover:!bg-amber-700 hover:!border-amber-700"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </EzButton>
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
        <div className="flex-1">
          <EzTextInput
            id="token-name"
            label="Nome do token"
            placeholder="Ex: Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>
        <EzButton
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="whitespace-nowrap"
        >
          Gerar Token
        </EzButton>
      </form>

      <div className="space-y-2">
        {listQuery.isLoading && (
          <p className="text-sm text-gray-500">Carregando...</p>
        )}
        {!listQuery.isLoading && listQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">Nenhum token criado ainda.</p>
        )}
        {listQuery.data?.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{token.name}</p>
              <p className="text-xs text-gray-500">
                Criado em {formatDate(token.createdAt)} · Último uso: {formatDate(token.lastUsedAt)}
              </p>
            </div>
            <EzButton
              type="button"
              variant="tertiary"
              size="small"
              onClick={() => handleRevoke(token.id)}
              className="!text-red-600 hover:!text-red-700"
            >
              Revogar
            </EzButton>
          </div>
        ))}
      </div>
    </div>
  );
}
