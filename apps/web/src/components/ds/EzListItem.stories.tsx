import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, ChevronRight, Ticket } from 'lucide-react';
import { EzListItem } from './EzListItem';
import { EzTag } from './EzTag';

/**
 * Aponta DS List Item (standalone) — linha única de lista reutilizável:
 * ícone opcional à esquerda, título + subtítulo e conteúdo/ação à direita.
 * Usado dentro de `EzList`, `EzScroller` e painéis de resultados.
 */
const meta: Meta<typeof EzListItem> = {
  title: 'DS/EzListItem',
  component: EzListItem,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzListItem>;

export const Default: Story = {
  args: {
    title: 'Chamado #4821 — Erro ao emitir nota fiscal',
  },
};

export const ComIconeESubtitulo: Story = {
  args: {
    icon: <Ticket size={18} />,
    title: 'Chamado #4821 — Erro ao emitir nota fiscal',
    subtitle: 'Social Tecnologia · aberto há 2 dias',
  },
};

export const Selecionado: Story = {
  args: {
    icon: <Building2 size={18} />,
    title: 'Refrigeração Mota',
    subtitle: 'Cliente desde 2021 — 12 contratos ativos',
    selected: true,
    onClick: () => undefined,
  },
};

export const ComRightContent: Story = {
  args: {
    icon: <Ticket size={18} />,
    title: 'Chamado #4830 — Lentidão no faturamento',
    subtitle: 'Empresa Social · SLA de 4h',
    rightContent: (
      <>
        <EzTag label="Urgente" variant="red" />
        <ChevronRight size={16} className="text-gray-400" />
      </>
    ),
    onClick: () => undefined,
  },
};

export const ListaDeChamados: Story = {
  render: () => (
    <div className="flex flex-col w-[420px]">
      <EzListItem
        icon={<Ticket size={18} />}
        title="Chamado #4821 — Erro ao emitir nota fiscal"
        subtitle="Social Tecnologia · aberto há 2 dias"
        rightContent={<EzTag label="Suporte" variant="petroleum" />}
        onClick={() => undefined}
      />
      <EzListItem
        icon={<Ticket size={18} />}
        title="Chamado #4822 — Dúvida sobre quarteirizado"
        subtitle="Refrigeração Mota · aguardando cliente"
        rightContent={<EzTag label="Baixa" variant="gray" />}
        selected
        onClick={() => undefined}
      />
      <EzListItem
        icon={<Ticket size={18} />}
        title="Chamado #4830 — Lentidão no faturamento"
        subtitle="Empresa Social · SLA de 4h"
        rightContent={<EzTag label="Urgente" variant="red" />}
        onClick={() => undefined}
      />
    </div>
  ),
};
