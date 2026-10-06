import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzUnderface } from './EzUnderface';

/**
 * Aponta DS Underface — container de "camada de fundo" usado para agrupar
 * visualmente seções de uma página. Superfície sem sombra, com fundo sutil e
 * borda discreta.
 */
const meta: Meta<typeof EzUnderface> = {
  title: 'DS/EzUnderface',
  component: EzUnderface,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzUnderface>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-1 text-[14px]">
        <span className="font-medium text-gray-900">Resumo do atendimento</span>
        <span className="text-gray-500">
          12 chamados abertos, 5 em atendimento e 3 aguardando retorno do cliente.
        </span>
      </div>
    ),
  },
};

export const ComMultiplosBlocos: Story = {
  args: {
    children: (
      <div className="grid grid-cols-3 gap-4 text-[14px]">
        {[
          ['SLA médio de resposta', '1h 42min'],
          ['Chamados resolvidos no mês', '87'],
          ['Satisfação do cliente', '4,6 / 5,0'],
        ].map(([titulo, valor]) => (
          <div key={titulo} className="flex flex-col gap-1">
            <span className="text-[12px] text-gray-500">{titulo}</span>
            <span className="text-[16px] font-medium text-gray-900">{valor}</span>
          </div>
        ))}
      </div>
    ),
  },
};

export const Aninhado: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-3 text-[14px]">
        <span className="font-medium text-gray-900">Detalhes do contrato</span>
        <EzUnderface>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-900">Cobertura</span>
            <span className="text-gray-500">
              Suporte N1 e N2 em horário comercial, com SLA de 4h para chamados críticos.
            </span>
          </div>
        </EzUnderface>
      </div>
    ),
  },
};
