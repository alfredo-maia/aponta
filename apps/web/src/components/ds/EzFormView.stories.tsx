import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzFormView } from './EzFormView';

/**
 * Aponta DS Form View — grade somente-leitura de label/valor (2 colunas em
 * telas médias). Usado na visualização de detalhes de chamados, clientes e
 * contratos do helpdesk.
 */
const meta: Meta<typeof EzFormView> = {
  title: 'DS/EzFormView',
  component: EzFormView,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzFormView>;

export const Default: Story = {
  args: {
    fields: [
      { label: 'Número do chamado', value: '#4821' },
      { label: 'Status', value: 'Em atendimento' },
      { label: 'Cliente', value: 'Social Tecnologia' },
      { label: 'Aberto em', value: '02/10/2026 09h14' },
    ],
  },
};

export const DetalheContrato: Story = {
  args: {
    fields: [
      { label: 'Contrato', value: 'CT-2026-003' },
      { label: 'Cliente', value: 'Refrigeração Mota Ltda' },
      { label: 'Vigência', value: '01/01/2026 a 31/12/2026' },
      { label: 'SLA contratado', value: '4 horas úteis' },
      { label: 'Faturamento', value: 'Mensal quarteirizado' },
      { label: 'Responsável', value: 'Equipe Infraestrutura' },
    ],
  },
};

export const ComValoresCustomizados: Story = {
  args: {
    fields: [
      { label: 'Cliente', value: 'Empresa Social' },
      {
        label: 'Situação',
        value: <span className="font-medium text-green-700">Ativo</span>,
      },
      {
        label: 'SLA do chamado',
        value: <span className="font-medium text-red-700">Em risco — 15 min restantes</span>,
      },
      {
        label: 'Observações',
        value: <span className="text-gray-500 italic">Cliente solicitou retorno por telefone.</span>,
      },
    ],
  },
};

export const CampoUnico: Story = {
  args: {
    fields: [{ label: 'Motivo do encerramento', value: 'Problema resolvido após reinício do servidor.' }],
  },
};
