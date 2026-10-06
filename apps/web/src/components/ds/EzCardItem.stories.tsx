import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzCardItem, EzEmptyCard } from './EzCardItem';
import { EzButton } from './EzButton';

/**
 * Aponta DS Card Item — contêiner de cartão genérico com cantos
 * arredondados, borda sutil e sombra leve (removível via `flat`). Usado
 * como invólucro para listas de chamados, resumos de clientes e blocos de
 * informação no helpdesk. Exporta também `EzEmptyCard`, variante para
 * estados vazios (sem resultados, sem anexos, sem contratos).
 */
const meta: Meta<typeof EzCardItem> = {
  title: 'DS/EzCardItem',
  component: EzCardItem,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzCardItem>;

export const Default: Story = {
  args: {
    children: 'Chamado #4821 — Falha no servidor de produção',
  },
};

export const Flat: Story = {
  args: {
    flat: true,
    children: 'Cliente: Social Tecnologia — sem sombra, uso em listas densas',
  },
};

export const ComConteudoRico: Story = {
  render: () => (
    <EzCardItem className="p-4 max-w-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold text-gray-900">
          Chamado #5120 — SLA em risco
        </span>
        <span className="text-[13px] text-gray-500">
          Cliente: Organização Alfa. Tempo de resposta acima do contratado.
        </span>
      </div>
    </EzCardItem>
  ),
};

export const EstadoVazio: Story = {
  render: () => (
    <EzEmptyCard
      title="Nenhum chamado encontrado"
      description="Não há chamados abertos para os filtros aplicados."
      action={<EzButton onClick={() => undefined}>Limpar filtros</EzButton>}
    />
  ),
};
