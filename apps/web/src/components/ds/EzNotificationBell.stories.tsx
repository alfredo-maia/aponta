import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzNotificationBell } from './EzNotificationBell';

/**
 * Aponta DS Notification Bell
 * Sino de notificações do cabeçalho: contador ("9+" acima de 9) e painel com
 * a lista, as não lidas destacadas, "Marcar todas como lidas" e os estados
 * vazio, carregando e erro. Componente de apresentação: a tela liga os dados.
 */
const meta: Meta<typeof EzNotificationBell> = {
  title: 'DS/EzNotificationBell',
  component: EzNotificationBell,
  tags: ['autodocs'],
  args: { onItemClick: () => undefined, onMarkAllRead: () => undefined },
  decorators: [(Story) => <div className="flex justify-end p-4 pb-96"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof EzNotificationBell>;

const items = [
  { id: 'n-1', title: 'Cronômetro encerrado automaticamente: ticket T-1001', body: 'O cronômetro de Ana no ticket T-1001 foi encerrado porque o tempo trabalhado atingiu a duração da agenda.', readAt: null, createdAt: '2026-11-13T13:00:00.000Z' },
  { id: 'n-2', title: 'Liberação pendente: Lançamento no ticket T-1002', body: 'Bia lançou um apontamento que depende da sua liberação.', readAt: null, createdAt: '2026-11-13T12:00:00.000Z' },
  { id: 'n-3', title: 'Apontamento liberado: ticket T-1003', body: 'O apontamento (Lançamento) foi liberado.', readAt: '2026-11-13T12:30:00.000Z', createdAt: '2026-11-13T11:00:00.000Z' },
];

export const ComNaoLidas: Story = { args: { items, unreadCount: 2 } };
export const MaisDeNove: Story = { args: { items, unreadCount: 12 } };
export const SemNaoLidas: Story = { args: { items: [items[2]], unreadCount: 0 } };
export const Vazio: Story = { args: { items: [], unreadCount: 0 } };
export const Carregando: Story = { args: { items: [], unreadCount: 0, loading: true } };
export const ComErro: Story = { args: { items: [], unreadCount: 0, error: true } };
