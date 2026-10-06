import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, Ticket } from 'lucide-react';
import { EzList, EzListItem } from './EzList';
import { EzTag } from './EzTag';

/**
 * Aponta DS List — contêiner `<ul>` para agrupar `EzListItem`s com borda e
 * divisores entre linhas. Use a prop `flush` para remover a borda externa e
 * os divisores quando o container já fornece o próprio contorno (ex.: dentro
 * de um `EzModalContainer` ou painel lateral).
 */
const meta: Meta<typeof EzList> = {
  title: 'DS/EzList',
  component: EzList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzList>;

export const Default: Story = {
  render: () => (
    <EzList className="w-[420px]">
      <EzListItem leading={<Ticket size={18} />} description="Social Tecnologia · aberto há 2 dias">
        Chamado #4821 — Erro ao emitir nota fiscal
      </EzListItem>
      <EzListItem leading={<Ticket size={18} />} description="Refrigeração Mota · aguardando cliente">
        Chamado #4822 — Dúvida sobre quarteirizado
      </EzListItem>
      <EzListItem leading={<Ticket size={18} />} description="Empresa Social · SLA de 4h">
        Chamado #4830 — Lentidão no faturamento
      </EzListItem>
    </EzList>
  ),
};

export const Flush: Story = {
  render: () => (
    <EzList flush className="w-[420px]">
      <EzListItem leading={<Building2 size={18} />} description="Cliente desde 2021 — 12 contratos ativos">
        Refrigeração Mota
      </EzListItem>
      <EzListItem leading={<Building2 size={18} />} description="Cliente desde 2023 — 3 contratos ativos">
        Social Tecnologia
      </EzListItem>
    </EzList>
  ),
};

export const ComAcoesClicaveis: Story = {
  render: () => (
    <EzList className="w-[420px]">
      <EzListItem
        leading={<Ticket size={18} />}
        description="Social Tecnologia · aberto há 2 dias"
        trailing={<EzTag label="Urgente" variant="red" />}
        onClick={() => undefined}
      >
        Chamado #4821 — Erro ao emitir nota fiscal
      </EzListItem>
      <EzListItem
        leading={<Ticket size={18} />}
        description="Empresa Social · SLA de 4h"
        trailing={<EzTag label="Baixa" variant="gray" />}
        onClick={() => undefined}
      >
        Chamado #4830 — Lentidão no faturamento
      </EzListItem>
    </EzList>
  ),
};

export const ListaVaziaComUmItem: Story = {
  args: {
    children: <EzListItem description="Nenhum chamado aberto no momento">Sem chamados pendentes</EzListItem>,
  },
};
