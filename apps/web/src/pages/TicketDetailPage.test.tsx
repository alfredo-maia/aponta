import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { TicketDetailPage } from './TicketDetailPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const ticket = {
  id: 't-1',
  protocol: 'AP-000001',
  title: 'Printer not working',
  description: 'The floor 2 printer is jammed.',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  requesterId: 'u-1',
  agentId: 'agent-1',
  serviceDeskId: 'sd-1',
  responseDeadline: '2026-09-30T14:00:00.000Z',
  resolveDeadline: '2026-10-02T17:30:00.000Z',
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
};

// Mutable so the POST mock can append and the next GET (after React Query
// invalidation) returns the new comment.
const comments = [
  {
    id: 'c-1',
    content: 'The printer has been restarted.',
    isInternal: false,
    ticketId: 't-1',
    authorId: 'agent-1',
    createdAt: '2026-09-28T11:00:00.000Z',
  },
  {
    id: 'c-2',
    content: 'Ordered a replacement fuser unit.',
    isInternal: true,
    ticketId: 't-1',
    authorId: 'agent-1',
    createdAt: '2026-09-28T12:00:00.000Z',
  },
];

function mockApi() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/tickets/t-1') {
      return Promise.resolve({ data: ticket });
    }
    if (url === '/tickets/t-1/comments') {
      // Snapshot copy: React Query structurally shares data, and handing out
      // the live array would let the POST push() mutate already-cached data,
      // suppressing the re-render a real (fresh JSON) API would trigger.
      return Promise.resolve({ data: [...comments] });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  vi.mocked(api.post).mockImplementation((url: string, body: unknown) => {
    const { content, isInternal } = body as {
      content: string;
      isInternal?: boolean;
    };
    if (url === '/tickets/t-1/comments') {
      const created = {
        id: `c-${comments.length + 1}`,
        content,
        isInternal: isInternal ?? false,
        ticketId: 't-1',
        authorId: 'u-1',
        createdAt: '2026-09-29T09:00:00.000Z',
      };
      comments.push(created);
      return Promise.resolve({ data: created });
    }
    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });
}

function setRole(role: 'CLIENT' | 'AGENT' | 'ADMIN') {
  useAuthStore.setState({
    token: 'fake.jwt.token',
    user: { sub: 'u-1', email: 'user@example.com', role },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tickets/t-1']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comments.length = 2;
    mockApi();
    setRole('CLIENT');
  });

  it('should render ticket details with status, priority and SLA deadlines', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Printer not working' }),
    ).toBeInTheDocument();
    expect(screen.getByText('AP-000001')).toBeInTheDocument();
    expect(
      screen.getByText('The floor 2 printer is jammed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/prazo de resposta/i)).toBeInTheDocument();
    expect(screen.getByText('2026-09-30 14:00 UTC')).toBeInTheDocument();
    expect(screen.getByText(/prazo de resolução/i)).toBeInTheDocument();
    expect(screen.getByText('2026-10-02 17:30 UTC')).toBeInTheDocument();
  });

  it('should render the comment timeline with an internal-note indicator only on internal comments', async () => {
    setRole('AGENT');
    renderPage();

    const publicContent = await screen.findByText(
      'The printer has been restarted.',
    );
    const publicItem = publicContent.closest('li');
    expect(publicItem).not.toBeNull();
    expect(
      within(publicItem as HTMLElement).queryByText(/nota interna/i),
    ).not.toBeInTheDocument();

    const internalContent = screen.getByText(
      'Ordered a replacement fuser unit.',
    );
    const internalItem = internalContent.closest('li');
    expect(internalItem).not.toBeNull();
    expect(
      within(internalItem as HTMLElement).getByText(/nota interna/i),
    ).toBeInTheDocument();
  });

  it('should show the comment form and post a new comment', async () => {
    const user = userEvent.setup();
    renderPage();

    const textarea = await screen.findByLabelText(/adicionar um comentário/i);
    await user.type(textarea, 'Follow-up question');
    await user.click(screen.getByRole('button', { name: /publicar comentário/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t-1/comments', {
        content: 'Follow-up question',
        isInternal: false,
      });
    });
    expect(await screen.findByText('Follow-up question')).toBeInTheDocument();
  });

  it('should show the isInternal checkbox for agents', async () => {
    setRole('AGENT');
    renderPage();

    await screen.findByText('Printer not working');
    expect(
      screen.getByRole('checkbox', { name: /nota interna/i }),
    ).toBeInTheDocument();
  });

  it('should show the isInternal checkbox for admins', async () => {
    setRole('ADMIN');
    renderPage();

    await screen.findByText('Printer not working');
    expect(
      screen.getByRole('checkbox', { name: /nota interna/i }),
    ).toBeInTheDocument();
  });

  it('should hide the isInternal checkbox for clients', async () => {
    setRole('CLIENT');
    renderPage();

    await screen.findByText('Printer not working');
    expect(
      screen.queryByRole('checkbox', { name: /nota interna/i }),
    ).not.toBeInTheDocument();
  });
});
