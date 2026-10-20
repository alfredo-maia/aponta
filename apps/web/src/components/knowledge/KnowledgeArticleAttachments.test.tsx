import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import {
  KnowledgeArticleAttachments,
  type KnowledgeAttachment,
} from './KnowledgeArticleAttachments';

vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const attachments: KnowledgeAttachment[] = [
  {
    id: 'att-1',
    originalName: 'manual.pdf',
    mimeType: 'application/pdf',
    fileUrl: '/uploads/manual.pdf',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
];

function renderComponent(props: Partial<React.ComponentProps<typeof KnowledgeArticleAttachments>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <KnowledgeArticleAttachments
        articleId="article-1"
        attachments={attachments}
        canManage={false}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, invalidateSpy };
}

describe('KnowledgeArticleAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('shows the attachment count in the section title', () => {
    renderComponent();
    expect(screen.getByText('Anexos (1)')).toBeInTheDocument();
  });

  it('shows zero in the title and an empty message when there are no attachments', () => {
    renderComponent({ attachments: [] });
    expect(screen.getByText('Anexos (0)')).toBeInTheDocument();
    expect(screen.getByText(/nenhum anexo/i)).toBeInTheDocument();
  });

  it('lists attachments with a download link for everyone, regardless of canManage', () => {
    renderComponent({ canManage: false });
    const link = screen.getByRole('link', { name: /manual\.pdf/i });
    expect(link).toHaveAttribute('href', '/uploads/manual.pdf');
  });

  it('does not show upload or remove controls when canManage is false', () => {
    renderComponent({ canManage: false });
    expect(screen.queryByText('Selecionar arquivo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
  });

  it('shows upload and remove controls when canManage is true', () => {
    renderComponent({ canManage: true });
    expect(screen.getByText('Selecionar arquivo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });

  it('uploads a file and invalidates the articles query on success', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'att-2', originalName: 'novo.png', mimeType: 'image/png', fileUrl: '/x', createdAt: '2026-01-01' },
    });
    const user = userEvent.setup();
    const { invalidateSpy } = renderComponent({ canManage: true });

    const file = new File(['bytes'], 'novo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/selecionar arquivo/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, file);

    await user.click(screen.getByRole('button', { name: /anexar arquivo/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/articles/article-1/attachments',
        expect.anything(),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['articles'], exact: false });
    });
  });

  it('shows an error mentioning the 25MB limit when upload fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('too big'));
    const user = userEvent.setup();
    renderComponent({ canManage: true });

    const file = new File(['bytes'], 'novo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/selecionar arquivo/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: /anexar arquivo/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/25\s?mb/i);
    });
  });

  it('deletes an attachment and invalidates the articles query on success', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    const { invalidateSpy } = renderComponent({ canManage: true });

    await user.click(screen.getByRole('button', { name: /remover/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/articles/article-1/attachments/att-1');
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['articles'], exact: false });
    });
  });
});
