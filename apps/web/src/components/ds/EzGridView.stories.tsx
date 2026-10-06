import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzGridView } from './EzGridView';

/**
 * Aponta DS Grid View — grade responsiva de 1 a 3 colunas (1 coluna no
 * mobile, 2 em md, 3 em lg). Usada nas listagens em cartão de chamados,
 * clientes e contratos do helpdesk.
 */
const meta: Meta<typeof EzGridView> = {
  title: 'DS/EzGridView',
  component: EzGridView,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzGridView>;

function CardChamado({ numero, titulo, status }: { numero: string; titulo: string; status: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[24px] border border-gray-200 bg-white p-4">
      <span className="text-[12px] font-medium text-brand-600">{numero}</span>
      <span className="text-[14px] font-semibold text-gray-900">{titulo}</span>
      <span className="text-[12px] text-gray-500">{status}</span>
    </div>
  );
}

const chamados = [
  { numero: '#4821', titulo: 'Falha no servidor de produção', status: 'Em atendimento — SLA 2h restantes' },
  { numero: '#4822', titulo: 'Erro ao emitir nota fiscal', status: 'Aguardando cliente' },
  { numero: '#4823', titulo: 'Instabilidade no acesso remoto', status: 'Aberto — prioridade alta' },
  { numero: '#4824', titulo: 'Atualização de contrato de SLA', status: 'Em análise comercial' },
  { numero: '#4825', titulo: 'Troca de equipamento refrigerado', status: 'Visita técnica agendada' },
  { numero: '#4826', titulo: 'Dúvida sobre faturamento', status: 'Resolvido' },
];

export const Default: Story = {
  args: { columns: 3 },
  render: (args) => (
    <EzGridView {...args}>
      {chamados.map((chamado) => (
        <CardChamado key={chamado.numero} {...chamado} />
      ))}
    </EzGridView>
  ),
};

export const DuasColunas: Story = {
  args: { columns: 2 },
  render: (args) => (
    <EzGridView {...args}>
      {chamados.slice(0, 4).map((chamado) => (
        <CardChamado key={chamado.numero} {...chamado} />
      ))}
    </EzGridView>
  ),
};

export const UmaColuna: Story = {
  args: { columns: 1 },
  render: (args) => (
    <EzGridView {...args}>
      {chamados.slice(0, 3).map((chamado) => (
        <CardChamado key={chamado.numero} {...chamado} />
      ))}
    </EzGridView>
  ),
};
