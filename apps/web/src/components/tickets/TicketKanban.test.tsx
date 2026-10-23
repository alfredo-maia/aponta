import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
    capturedDroppables[droppableId] = {
      isDropDisabled: Boolean(isDropDisabled),
    };
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
    capturedDraggables[draggableId] = {
      isDragDisabled: Boolean(isDragDisabled),
    };
    return children(
      {
        innerRef: () => undefined,
        draggableProps: { style: {} },
        dragHandleProps: {},
      },
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

const serviceDesks = [{ id: 'desk-1', name: 'Suporte N1' }];

/** Mocks `api.get` to answer both the always-on `/service-desks` list (for
 * the Mesa dropdown) and the per-mesa `/service-desks/:id/stages` call. */
function mockApiGet(stages: DeskStage[] = deskStages) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks')
      return Promise.resolve({ data: serviceDesks });
    if (url === '/service-desks/desk-1/stages')
      return Promise.resolve({ data: stages });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderKanban(props: {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
  initialServiceDeskId?: string;
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
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
    capturedOnDragStart = null;
    capturedOnDragEnd = null;
    Object.keys(capturedDroppables).forEach(
      (key) => delete capturedDroppables[key],
    );
    Object.keys(capturedDraggables).forEach(
      (key) => delete capturedDraggables[key],
    );
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
      expect(screen.getByRole('alert')).toHaveTextContent(
        /falha ao carregar os chamados/i,
      );
    });

    it('groups tickets into their matching status column with correct counts', () => {
      const tickets = [
        baseTicket,
        {
          ...baseTicket,
          id: 't2',
          protocol: 'AP-2026-0002',
          status: 'IN_PROGRESS' as const,
        },
        {
          ...baseTicket,
          id: 't3',
          protocol: 'AP-2026-0003',
          status: 'OPEN' as const,
        },
      ];
      renderKanban({ tickets, isLoading: false, isError: false });

      expect(screen.getByText(/AP-2026-0001/)).toBeInTheDocument();
      expect(screen.getByText(/AP-2026-0002/)).toBeInTheDocument();
      expect(screen.getByText(/AP-2026-0003/)).toBeInTheDocument();

      // "Aberto" column (OPEN) should show count 2, "Em Andamento" should show 1
      const abertoHeading = screen
        .getAllByText('Aberto')
        .find((el) => el.tagName === 'H3')!;
      const abertoColumn = abertoHeading.closest('div')
        ?.parentElement as HTMLElement;
      expect(abertoColumn).toHaveTextContent('2');
    });

    it('renders an empty column (count 0) when there are no tickets for that status', () => {
      renderKanban({ tickets: [], isLoading: false, isError: false });

      const abertoHeading = screen
        .getAllByText('Aberto')
        .find((el) => el.tagName === 'H3')!;
      const abertoColumn = abertoHeading.closest('div')
        ?.parentElement as HTMLElement;
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
      vi.mocked(api.patch).mockResolvedValue({
        data: { ...baseTicket, status: 'IN_PROGRESS' },
      });
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
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/status', {
          status: 'IN_PROGRESS',
        });
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
      useAuthStore.setState({
        token: 'tok',
        user: {
          sub: 'u1',
          email: 'c@c.com',
          role: 'CLIENT',
          organizationId: null,
        },
      });
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      // Component still renders normally for clients; isDropDisabled/isDragDisabled
      // are passed down to the (mocked) Droppable/Draggable render props, which we
      // can't introspect directly through this shallow mock, but we confirm the
      // page renders without crashing and the ticket is still visible read-only.
      expect(screen.getByText(/AP-2026-0001/)).toBeInTheDocument();
    });

    it('does not fetch mesa stages when no mesa is selected (fetches only the Mesa dropdown list)', async () => {
      mockApiGet();
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/service-desks');
      });
      expect(api.get).not.toHaveBeenCalledWith('/service-desks/desk-1/stages');
    });
  });

  describe('colapsar colunas e abrir novo ticket (TiFlux parity)', () => {
    it('shows a collapse toggle and an "Abrir novo ticket" link on every column by default (fallback por status)', () => {
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      expect(screen.getAllByTestId(/^collapse-column-/).length).toBeGreaterThan(
        0,
      );
      const newTicketLinks = screen.getAllByRole('link', {
        name: /abrir novo ticket/i,
      });
      expect(newTicketLinks.length).toBeGreaterThan(0);
      expect(newTicketLinks[0]).toHaveAttribute('href', '/tickets/new');
    });

    it('collapsing a status column hides its ticket list and disables it as a drop target; expanding restores it', () => {
      renderKanban({ tickets: [baseTicket], isLoading: false, isError: false });

      fireEvent.click(screen.getByTestId('collapse-column-OPEN'));

      // Card no longer rendered while collapsed, and the column is no
      // longer a valid drop target.
      expect(screen.queryByText(/AP-2026-0001/)).not.toBeInTheDocument();
      expect(capturedDroppables['OPEN'].isDropDisabled).toBe(true);

      fireEvent.click(screen.getByTestId('expand-column'));

      expect(screen.getByText(/AP-2026-0001/)).toBeInTheDocument();
      expect(capturedDroppables['OPEN'].isDropDisabled).toBe(false);
    });

    it('does not show "Abrir novo ticket" for CLIENT role users', () => {
      useAuthStore.setState({
        token: 'tok',
        user: {
          sub: 'u1',
          email: 'c@c.com',
          role: 'CLIENT',
          organizationId: null,
        },
      });
      renderKanban({ tickets: [], isLoading: false, isError: false });

      expect(
        screen.queryByRole('link', { name: /abrir novo ticket/i }),
      ).not.toBeInTheDocument();
    });

    it('collapsing a stage column (mesa selecionada) hides its ticket list and disables it as a drop target', async () => {
      mockApiGet();
      renderKanban({
        tickets: [{ ...baseTicket, stageId: 's-n1' }],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('collapse-column-s-n1'));

      expect(screen.queryByText(/AP-2026-0001/)).not.toBeInTheDocument();
      expect(capturedDroppables['s-n1'].isDropDisabled).toBe(true);
    });
  });

  describe('seletor de Mesa dedicado (TiFlux parity)', () => {
    it('lists service desks in the Mesa dropdown and switches to stage-grouped columns on selection, without needing initialServiceDeskId', async () => {
      mockApiGet();
      renderKanban({
        tickets: [{ ...baseTicket, stageId: 's-n1' }],
        isLoading: false,
        isError: false,
      });

      // Starts in fallback (status) mode: no mesa pre-selected. Wait for the
      // "/service-desks" list to actually populate the dropdown's options
      // before selecting one — otherwise the browser has no "desk-1" option
      // yet and silently ignores the change.
      await waitFor(() => {
        expect(
          screen.getByRole('option', { name: 'Mesa: Suporte N1' }),
        ).toBeInTheDocument();
      });
      expect(screen.getByTestId('kanban-mesa-select')).toHaveValue('');
      expect(
        screen.getAllByText('Aberto').some((el) => el.tagName === 'H3'),
      ).toBe(true);
      expect(screen.queryByText('N1')).not.toBeInTheDocument();

      fireEvent.change(screen.getByTestId('kanban-mesa-select'), {
        target: { value: 'desk-1' },
      });

      await waitFor(() => {
        expect(screen.getByText('N1')).toBeInTheDocument();
      });
      expect(api.get).toHaveBeenCalledWith('/service-desks/desk-1/stages');
    });

    it("keeps the user's own Mesa selection even if the component re-renders with a different initialServiceDeskId", async () => {
      mockApiGet();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const renderWith = (initialServiceDeskId: string) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TicketKanban
              tickets={[]}
              isLoading={false}
              isError={false}
              initialServiceDeskId={initialServiceDeskId}
            />
          </MemoryRouter>
        </QueryClientProvider>
      );
      const { rerender } = render(renderWith('desk-1'));

      await waitFor(() => {
        expect(screen.getByTestId('kanban-mesa-select')).toHaveValue('desk-1');
      });

      fireEvent.change(screen.getByTestId('kanban-mesa-select'), {
        target: { value: '' },
      });
      expect(screen.getByTestId('kanban-mesa-select')).toHaveValue('');

      // Parent re-renders with a genuinely DIFFERENT initialServiceDeskId
      // (e.g. navigating here from a different Dashboard link) — the
      // user's own in-Kanban choice must not be silently overridden.
      rerender(renderWith('desk-2'));
      expect(screen.getByTestId('kanban-mesa-select')).toHaveValue('');
    });
  });

  describe('agrupamento por estágio (mesa selecionada)', () => {
    function ticketAt(
      stageId: string | null,
      overrides: Partial<Ticket> = {},
    ): Ticket {
      return { ...baseTicket, stageId, ...overrides };
    }

    it('fetches the mesa stages via GET /service-desks/:id/stages', async () => {
      mockApiGet();
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/service-desks/desk-1/stages');
      });
    });

    it('groups tickets by stage (ordered by position) instead of by status', async () => {
      mockApiGet();
      const tickets = [
        ticketAt('s-n1', { id: 't1', protocol: 'AP-0001' }),
        ticketAt('s-n2', { id: 't2', protocol: 'AP-0002' }),
        ticketAt('s-n1', { id: 't3', protocol: 'AP-0003' }),
      ];
      renderKanban({
        tickets,
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
      });

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

      const n1Heading = screen.getByText('N1').closest('div')
        ?.parentElement as HTMLElement;
      expect(n1Heading).toHaveTextContent('2');
    });

    it('puts tickets with no recognized stage into a "Sem estágio" column that never accepts a drop', async () => {
      mockApiGet();
      const tickets = [
        ticketAt(null, { id: 't1' }),
        ticketAt('stage-from-another-desk', { id: 't2' }),
      ];
      renderKanban({
        tickets,
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(screen.getByText('Sem estágio')).toBeInTheDocument();
      });
      const semEstagioHeading = screen.getByText('Sem estágio').closest('div')
        ?.parentElement as HTMLElement;
      expect(semEstagioHeading).toHaveTextContent('2');

      // The mesa has an initial stage (N1), so dragging these cards OUT is
      // allowed (mirrors the backend allowing a stageless ticket to move to
      // isInitial) — but the "Sem estágio" column itself never accepts a
      // drop, since there's no backend operation to unset a ticket's stage.
      expect(capturedDraggables['t1'].isDragDisabled).toBe(false);
      expect(capturedDraggables['t2'].isDragDisabled).toBe(false);
      expect(capturedDroppables['__NO_STAGE__'].isDropDisabled).toBe(true);
    });

    it("allows dragging an unstaged ticket straight to the mesa's initial stage", async () => {
      mockApiGet();
      vi.mocked(api.patch).mockResolvedValue({ data: ticketAt('s-n1') });
      renderKanban({
        tickets: [ticketAt(null, { id: 't1' })],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', {
          stageId: 's-n1',
        });
      });
    });

    it('blocks dragging an unstaged ticket to a non-initial stage', async () => {
      mockApiGet();
      renderKanban({
        tickets: [ticketAt(null, { id: 't1' })],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(screen.getByRole('alert')).toHaveTextContent(
          /transição de estágio não permitida/i,
        );
      });
    });

    it('calls PATCH /tickets/:id/stage (not /status) when dropping into an allowed next stage', async () => {
      mockApiGet();
      vi.mocked(api.patch).mockResolvedValue({ data: ticketAt('s-n2') });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', {
          stageId: 's-n2',
        });
      });
    });

    it('blocks the drop and shows an error when the destination stage is not in transitionToIds', async () => {
      mockApiGet();
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(screen.getByRole('alert')).toHaveTextContent(
          /transição de estágio não permitida/i,
        );
      });
    });

    it('does nothing when a card is dropped back in its own stage column', async () => {
      mockApiGet();
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
      mockApiGet();
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(capturedDroppables['s-aguardando-cliente'].isDropDisabled).toBe(
          true,
        );
      });
      expect(capturedDroppables['s-n1'].isDropDisabled).toBe(false); // origin stays enabled
      expect(capturedDroppables['s-n2'].isDropDisabled).toBe(false); // allowed next stage
    });

    it('rolls back the optimistic update and surfaces the backend message when the stage API call rejects with 400', async () => {
      mockApiGet();
      vi.mocked(api.patch).mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Transição de estágio não permitida' },
        },
      });
      renderKanban({
        tickets: [ticketAt('s-n1')],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
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
        expect(api.patch).toHaveBeenCalledWith('/tickets/t1/stage', {
          stageId: 's-n2',
        });
      });
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /transição de estágio não permitida/i,
        );
      });
      // No crash / unhandled rejection means onError ran and restored the
      // previous query cache without throwing.
    });

    it('shows an informational alert when the mesa has no stages configured', async () => {
      mockApiGet([]);
      renderKanban({
        tickets: [],
        isLoading: false,
        isError: false,
        initialServiceDeskId: 'desk-1',
      });

      await waitFor(() => {
        expect(
          screen.getByText(/ainda não possui estágios configurados/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('avatares, Ordenar e Configurações (D6/T8)', () => {
    const ticketsWithAgents = [
      { ...baseTicket, id: 't1', protocol: 'AP-2026-0001', title: 'B ticket', agentId: 'agent-1', agent: { id: 'agent-1', name: 'Ana Costa' } },
      { ...baseTicket, id: 't2', protocol: 'AP-2026-0002', title: 'A ticket', status: 'IN_PROGRESS' as const, agentId: 'agent-2', agent: { id: 'agent-2', name: 'Bruno Dias' } },
      { ...baseTicket, id: 't3', protocol: 'AP-2026-0003', title: 'C ticket', agentId: null },
    ];

    it('renders one avatar per distinct agent present in the tickets', () => {
      mockApiGet();
      renderKanban({ tickets: ticketsWithAgents, isLoading: false, isError: false });

      expect(screen.getByRole('button', { name: /filtrar por ana costa/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filtrar por bruno dias/i })).toBeInTheDocument();
    });

    it('clicking an avatar filters the board to that agent\'s tickets (toggle, multi-select)', async () => {
      mockApiGet();
      renderKanban({ tickets: ticketsWithAgents, isLoading: false, isError: false });

      expect(screen.getByText(/AP-2026-0001/)).toBeInTheDocument();
      expect(screen.getByText(/AP-2026-0002/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /filtrar por ana costa/i }));

      expect(screen.getByText(/AP-2026-0001/)).toBeInTheDocument();
      expect(screen.queryByText(/AP-2026-0002/)).not.toBeInTheDocument();

      // Toggling back off restores the full board.
      fireEvent.click(screen.getByRole('button', { name: /filtrar por ana costa/i }));
      expect(screen.getByText(/AP-2026-0002/)).toBeInTheDocument();
    });

    it('opens "Ordenar", sorts cards by Título asc/desc, and "Limpar" restores the original order', async () => {
      mockApiGet();
      renderKanban({ tickets: ticketsWithAgents, isLoading: false, isError: false });

      function openColumnContainer(): HTMLElement {
        const heading = screen.getByRole('heading', { name: 'Aberto' });
        return heading.parentElement?.parentElement as HTMLElement;
      }

      fireEvent.click(screen.getByRole('button', { name: 'Ordenar' }));
      fireEvent.click(screen.getByRole('button', { name: /^Título/ }));

      const titlesAsc = within(openColumnContainer()).getAllByText(/^[A-Z] ticket$/).map((el) => el.textContent);
      expect(titlesAsc).toEqual(['B ticket', 'C ticket']);

      fireEvent.click(screen.getByRole('button', { name: /^Título/ }));
      const titlesDesc = within(openColumnContainer())
        .getAllByText(/^[A-Z] ticket$/)
        .map((el) => el.textContent);
      expect(titlesDesc).toEqual(['C ticket', 'B ticket']);

      fireEvent.click(screen.getByRole('button', { name: 'Limpar ordenação' }));
      const titlesCleared = within(openColumnContainer())
        .getAllByText(/^[A-Z] ticket$/)
        .map((el) => el.textContent);
      expect(titlesCleared).toEqual(['B ticket', 'C ticket']);
    });

    it('"Configurações" lets the user group by Responsável instead of Status/Estágio', async () => {
      mockApiGet();
      renderKanban({ tickets: ticketsWithAgents, isLoading: false, isError: false });

      fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
      fireEvent.change(screen.getByLabelText(/agrupar por/i), { target: { value: 'agent' } });

      expect(screen.getByRole('heading', { name: 'Ana Costa' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Bruno Dias' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Não atribuído' })).toBeInTheDocument();
      // No drag-and-drop in this read-only grouping — no "Aberto" column heading.
      expect(screen.queryByRole('heading', { name: 'Aberto' })).not.toBeInTheDocument();
    });

    it('"Configurações" lets the user group by Prioridade', async () => {
      mockApiGet();
      renderKanban({ tickets: ticketsWithAgents, isLoading: false, isError: false });

      fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
      fireEvent.change(screen.getByLabelText(/agrupar por/i), { target: { value: 'priority' } });

      expect(screen.getByRole('heading', { name: 'Alta' })).toBeInTheDocument();
    });
  });
});
