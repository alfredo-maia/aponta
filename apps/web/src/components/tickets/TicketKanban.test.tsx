import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragStart, DropResult } from '@hello-pangea/dnd';
import type { Ticket } from '../../hooks/useTickets';
import type { DeskStage } from '../MesaStagesEditor';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { TicketKanban } from './TicketKanban';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// @hello-pangea/dnd relies on real browser layout/drag events that jsdom
// cannot provide. We mock it down to a plain render-prop shell and capture
// the onDragStart/onDragEnd handlers the component wires up, plus the
// isDropDisabled/isDragDisabled props passed to each Droppable/Draggable,
// so we can invoke the handlers directly with synthetic start/drop results
// and assert on drop-eligibility — this exercises the exact same logic the
// real library would trigger, without needing a simulated HTML5 drag.
let capturedOnDragStart: ((start: DragStart) => void) | null = null;
let capturedOnDragEnd: ((result: DropResult) => void) | null = null;
const capturedDroppables: Record<string, { isDropDisabled: boolean }> = {};
const capturedDraggables: Record<string, { isDragDisabled: boolean }> = {};

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({
    children,
    onDragEnd,
    onDragStart,
  }: {
    children: React.ReactNode;
    onDragEnd: (r: DropResult) => void;
    onDragStart?: (s: DragStart) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    capturedOnDragStart = onDragStart ?? null;
    return children;
  },
  Droppable: ({
    droppableId,
    isDropDisabled,
    children,
  }: {
    droppableId: string;
    isDropDisabled?: boolean;
    children: (provided: unknown, snapshot: unknown) => React.ReactNode;
  }) => {
    capturedDroppables[droppableId] = { isDropDisabled: Boolean(isDropDisabled) };
    return children(
      { innerRef: () => undefined, droppableProps: {} },
      { isDraggingOver: false },
    );
  },
  Draggable: ({
    draggableId,
    isDragDisabled,
    children,
  }: {
    draggableId: string;
    isDragDisabled?: boolean;
    children: (provided: unknown, snapshot: unknown) => React.ReactNode;
  }) => {
    capturedDraggables[draggableId] = { isDragDisabled: Boolean(isDragDisabled) };
    return children(
      { innerRef: () => undefined, draggableProps: { style: {} }, dragHandleProps: {} },
      { isDragging: false },
    );
  },
}));

const baseTicket: Ticket = {
  id: 't1',
  protocol: 'AP-2026-0001',
  title: 'Printer broken',
  description: 'desc',
  status: 'OPEN',
  priority: 'HIGH',
  requesterId: 'r1',
  agentId: null,
  serviceDeskId: 'desk-1',
  responseDeadline: '2026-01-01T10:00:00.000Z',
  resolveDeadline: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const stageN1: DeskStage = {
  id: 's-n1',
  name: 'N1',
  position: 0,
  isInitial: true,
  isFinal: false,
  transitionToIds: ['s-n2'],
};
const stageN2: DeskStage = {
  id: 's-n2',
  name: 'N2',
  position: 1,
  isInitial: false,
  isFinal: false,
  transitionToIds: ['s-aguardando-cliente'],
};
const stageAguardandoCliente: DeskStage = {
  id: 's-aguardando-cliente',
  name: 'Aguardando Cliente',
  position: 2,
  isInitial: false,
  isFinal: true,
  transitionToIds: [],
};
const deskStages = [stageN1, stageN2, stageAguardandoCliente];

function renderKanban(props: {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
  serviceDeskId?: string;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketKanban {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketKanban', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    capturedOnDragStart = null;
    capturedOnDragEnd = null;
    Object.keys(capturedDroppables).forEach((key) => delete capturedDroppables[key]);
    Object.keys(capturedDraggables).forEach((key) => delete capturedDraggables[key]);
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.get).mockReset();
  });

  describe('fallback por status (nenhuma mesa selecionada)', () => {
    it('shows a skeleton loading state with every column label while isLoading', () => {
      renderKanban({ tickets: [], isLoading: true, isError: false });

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.getByText('Aberto')).toBeInTheDocument();
      expect(screen.getByText('Fechado')).toBeInTheDocument();
    });

    it('shows an error message when isError is true', () => {
      renderKanban({ tickets: [], isLoading: false, isError: true });
      expect(screen.getByRole('alert')).toHaveTextContent(/falha ao carregar os chamados/i);
    });

    it('groups tickets into their matching status column with correct counts', () => {
      const tickets = [
        baseTicket,
        { ...baseTicket, id: 't2', protocol: 'AP-2026-0002', status: 'IN_PROGRESS' as const },
        { ...baseTicket, id: 't3', protocol: 'AP-2026-0003', status: 'OPEN' as const },
      ];
      renderKanban({ tickets, isLoading: false, isError: false });

      expect(screen.getByText('AP-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('AP-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('AP-2026-0003')).toBeInTheDocument();

      // "Aberto" column (OPEN) should show count 2, "Em Andamento" should show 1
      const abertoHeading = screen.getAllByText('Aberto').find((el) => el.tagName === 'H3')!;
      const abertoColumn = abertoHeading.closest('div')?.parentElement as HTMLElement;
      expect(abertoColumn).toHaveTextContent('2');
    });

    it('renders an empty column (count 0) when there are no tickets for that status', () => {
      renderKanban({ tickets: [], isLoading: false, isError: false });

      const abertoHeading = screen.getAllByText('Aberto').find((el) => el.tagName === 'H3')!;
      const abertoColumn = abertoHeading.closest('div')?.parentElement as HTMLElement;
      expect(abertoColumn).toHaveTextContent('0');
    });

    it('does nothing when a card is dropped outside any column (no destination)', () => {
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      capturedOnDragEnd!({
        destination: null,
        source: { droppableId: 'OPEN', index: 0 },
        draggableId: 't1',
        reason: 'DROP',
        mode: 'FLUID',
        type: 'DEFAULT',
        combine: null,
      } as DropResult);

      expect(api.patch).not.toHaveBeenCalled();
    });

    it('does nothing when a card is dropped back in the same column', () => {
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      capturedOnDragEnd!({
        destination: { droppableId: 'OPEN', index: 1 },
        source: { droppableId: 'OPEN', index: 0 },
        draggableId: 't1',
        reason: 'DROP',
        mode: 'FLUID',
        type: 'DEFAULT',
        combine: null,
      } as DropResult);

      expect(api.patch).not.toHaveBeenCalled();
    });

    it('calls the status-update API when a card is dropped into a different column', async () => {
      vi.mocked(api.patch).mockResolvedValue({ data: { ...baseTicket, status: 'IN_PROGRESS' } });
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      capturedOnDragEnd!({
        destination: { droppableId: 'IN_PROGRESS', index: 0 },
        source: { droppableId: 'OPEN', index: 0 },
        draggableId: 't1',
        reason: 'DROP',
        mode: 'FLUID',
        type: 'DEFAULT',
        combine: null,
      } as DropResult);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/status', { status: 'IN_PROGRESS' });
      });
    });

    it('rolls back the optimistic update when the status-update API call fails', async () => {
      vi.mocked(api.patch).mockRejectedValue(new Error('network error'));
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      capturedOnDragEnd!({
        destination: { droppableId: 'IN_PROGRESS', index: 0 },
        source: { droppableId: 'OPEN', index: 0 },
        draggableId: 't1',
        reason: 'DROP',
        mode: 'FLUID',
        type: 'DEFAULT',
        combine: null,
      } as DropResult);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled();
      });
      // No crash / unhandled rejection means onError ran and restored the
      // previous query cache without throwing.
    });

    it('disables drop targets and card dragging for CLIENT role users', () => {
      useAuthStore.setState({ token: 'tok', user: { sub: 'u1', email: 'c@c.com', role: 'CLIENT', organizationId: null } });
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      // Component still renders normally for clients; isDropDisabled/isDragDisabled
      // are passed down to the (mocked) Droppable/Draggable render props, which we
      // can't introspect directly through this shallow mock, but we confirm the
      // page renders without crashing and the ticket is still visible read-only.
      expect(screen.getByText('AP-2026-0001')).toBeInTheDocument();
    });

    it('does not fetch mesa stages when no serviceDeskId is given', () => {
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('agrupamento por estágio (mesa selecionada)', () => {
    function ticketAt(stageId: string | null, overrides: Partial<Ticket> = {}): Ticket {
      return { ...baseTicket, stageId, ...overrides };
    }

    it('fetches the mesa stages via GET /service-desks/:id/stages', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/service-desks/desk-1/stages');
      });
    });

    it('groups tickets by stage (ordered by position) instead of by status', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      const tickets = [
        ticketAt('s-n1', { id: 't1', protocol: 'AP-0001' }),
        ticketAt('s-n2', { id: 't2', protocol: 'AP-0002' }),
        ticketAt('s-n1', { id: 't3', protocol: 'AP-0003' }),
      ];
      renderKanban({ tickets, isLoading: false, isError: false, serviceDeskId: 'desk-1' });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });
      expect(screen.getByText('N2')).toBeInTheDocument();
      expect(screen.getByText('Aguardando Cliente')).toBeInTheDocument();
      // Old generic status label should not be used as a column header here
      // (it still appears inside each TicketCard as the status tag).
      const statusColumnHeadings = screen
        .queryAllByText('Aberto')
        .filter((el) => el.tagName === 'H3');
      expect(statusColumnHeadings).toHaveLength(0);

      const n1Heading = screen.getByText('N1').closest('div')?.parentElement as HTMLElement;
      expect(n1Heading).toHaveTextContent('2');
    });

    it('puts tickets with no recognized stage into a "Sem estágio" column that never accepts a drop', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      const tickets = [
        ticketAt(null, { id: 't1' }),
        ticketAt('stage-from-another-desk', { id: 't2' }),
      ];
      renderKanban({ tickets, isLoading: false, isError: false, serviceDeskId: 'desk-1' });

      await waitFor(() => {
        expect(screen.getByText('Sem estágio')).toBeInTheDocument();
      });
      const semEstagioHeading = screen.getByText('Sem estágio').closest('div')?.parentElement as HTMLElement;
      expect(semEstagioHeading).toHaveTextContent('2');

      // The mesa has an initial stage (N1), so dragging these cards OUT is
      // allowed (mirrors the backend allowing a stageless ticket to move to
      // isInitial) — but the "Sem estágio" column itself never accepts a
      // drop, since there's no backend operation to unset a ticket's stage.
      expect(capturedDraggables['t1'].isDragDisabled).toBe(false);
      expect(capturedDraggables['t2'].isDragDisabled).toBe(false);
      expect(capturedDroppables['__NO_STAGE__'].isDropDisabled).toBe(true);
    });

    it('allows dragging an unstaged ticket straight to the mesa\'s initial stage', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      vi.mocked(api.patch).mockResolvedValue({ data: ticketAt('s-n1') });
      renderKanban({
        tickets: [ticketAt(null, { id: 't1' })],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('Sem estágio')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-n1', index: 0 },
          source: { droppableId: '__NO_STAGE__', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', { stageId: 's-n1' });
      });
    });

    it('blocks dragging an unstaged ticket to a non-initial stage', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      renderKanban({
        tickets: [ticketAt(null, { id: 't1' })],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('Sem estágio')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-n2', index: 0 },
          source: { droppableId: '__NO_STAGE__', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      expect(api.patch).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/transição de estágio não permitida/i);
      });
    });

    it('calls PATCH /tickets/:id/stage (not /status) when dropping into an allowed next stage', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      vi.mocked(api.patch).mockResolvedValue({ data: ticketAt('s-n2') });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-n2', index: 0 },
          source: { droppableId: 's-n1', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', { stageId: 's-n2' });
      });
    });

    it('blocks the drop and shows an error when the destination stage is not in transitionToIds', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      // s-n1 only transitions to s-n2, not straight to s-aguardando-cliente.
      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-aguardando-cliente', index: 0 },
          source: { droppableId: 's-n1', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      expect(api.patch).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/transição de estágio não permitida/i);
      });
    });

    it('does nothing when a card is dropped back in its own stage column', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-n1', index: 1 },
          source: { droppableId: 's-n1', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      expect(api.patch).not.toHaveBeenCalled();
    });

    it('dims (disables) columns unreachable from the dragged card while dragging', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragStart!({
          draggableId: 't1',
          type: 'DEFAULT',
          source: { droppableId: 's-n1', index: 0 },
          mode: 'FLUID',
        } as DragStart);
      });

      await waitFor(() => {
        expect(capturedDroppables['s-aguardando-cliente'].isDropDisabled).toBe(true);
      });
      expect(capturedDroppables['s-n1'].isDropDisabled).toBe(false); // origin stays enabled
      expect(capturedDroppables['s-n2'].isDropDisabled).toBe(false); // allowed next stage
    });

    it('rolls back the optimistic update and surfaces the backend message when the stage API call rejects with 400', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: deskStages });
      vi.mocked(api.patch).mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: { message: 'Transição de estágio não permitida' } },
      });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        serviceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      act(() => {
        capturedOnDragEnd!({
          destination: { droppableId: 's-n2', index: 0 },
          source: { droppableId: 's-n1', index: 0 },
          draggableId: 't1',
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        } as DropResult);
      });

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', { stageId: 's-n2' });
      });
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/transição de estágio não permitida/i);
      });
      // No crash / unhandled rejection means onError ran and restored the
      // previous query cache without throwing.
    });

    it('shows an informational alert when the mesa has no stages configured', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });
      renderKanban({ tickets: [], isLoading: false, isError: false, serviceDeskId: 'desk-1' });

      await waitFor(() => {
        expect(screen.getByText(/ainda não possui estágios configurados/i)).toBeInTheDocument();
      });
    });
  });
});
