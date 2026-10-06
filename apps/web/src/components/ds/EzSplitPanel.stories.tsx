import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzSplitPanel } from './EzSplitPanel';

/**
 * Aponta DS Split Panel — dois painéis lado a lado separados por um divisor
 * arrastável. Usado na tela de atendimento: lista de chamados à esquerda e
 * detalhe do chamado selecionado à direita.
 */
const meta: Meta<typeof EzSplitPanel> = {
  title: 'DS/EzSplitPanel',
  component: EzSplitPanel,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSplitPanel>;

const listaChamados = (
  <div className="flex flex-col gap-1 p-3 text-[14px]">
    <span className="px-1 pb-2 text-[12px] font-medium uppercase text-gray-500">
      Fila de atendimento
    </span>
    {[
      ['#4821', 'Impressora do financeiro sem toner'],
      ['#4822', 'ERP Sankhya lento no faturamento'],
      ['#4823', 'VPN não conecta no home office'],
      ['#4824', 'Notebook não liga após atualização'],
    ].map(([numero, assunto]) => (
      <div key={numero} className="flex flex-col rounded-[8px] border border-gray-200 bg-white p-2">
        <span className="font-medium text-gray-900">Chamado {numero}</span>
        <span className="text-gray-500">{assunto}</span>
      </div>
    ))}
  </div>
);

const detalheChamado = (
  <div className="flex flex-col gap-2 p-4 text-[14px]">
    <span className="text-[16px] font-medium text-gray-900">
      Chamado #4821 — Impressora do financeiro sem toner
    </span>
    <span className="text-[12px] text-gray-500">
      Aberto por Maria Silva · Prioridade alta · SLA de 4h
    </span>
    <p className="text-gray-700">
      Cliente reporta que a impressora do setor financeiro está sem toner e não há
      reposição no estoque local. Solicitada visita técnica com peça de reposição.
    </p>
  </div>
);

export const Default: Story = {
  args: {
    left: listaChamados,
    right: detalheChamado,
    className: 'h-[320px] rounded-[12px] border border-gray-200 overflow-hidden',
  },
};

export const SplitInicial30: Story = {
  args: {
    left: listaChamados,
    right: detalheChamado,
    defaultSplit: 30,
    className: 'h-[320px] rounded-[12px] border border-gray-200 overflow-hidden',
  },
};

export const LimitesDeRedimensionamento: Story = {
  args: {
    left: listaChamados,
    right: detalheChamado,
    defaultSplit: 50,
    minSplit: 25,
    maxSplit: 75,
    className: 'h-[320px] rounded-[12px] border border-gray-200 overflow-hidden',
  },
};
