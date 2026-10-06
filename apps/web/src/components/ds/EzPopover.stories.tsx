import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzButton } from './EzButton';
import { EzPopover } from './EzPopover';

/**
 * Aponta DS Popover — elemento acionado por clique para exibir conteúdo rico
 * (diferente do tooltip, que é texto simples acionado por hover). Fecha ao
 * clicar fora. Suporta alinhamento horizontal (`left`/`right`/`center`) e
 * posição vertical (`top`/`bottom`) em relação ao elemento disparador.
 */
const meta: Meta<typeof EzPopover> = {
  title: 'DS/EzPopover',
  component: EzPopover,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPopover>;

export const Default: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Detalhes do cliente" />,
    content: (
      <div className="w-64 text-[14px] text-gray-700">
        Social Tecnologia — cliente desde 2021, 12 contratos ativos.
      </div>
    ),
  },
};

export const AlinhadoEsquerda: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Ver SLA" />,
    content: (
      <div className="w-56 text-[14px] text-gray-700">
        SLA contratual: resposta em até 4h para chamados críticos.
      </div>
    ),
    align: 'left',
  },
};

export const AlinhadoDireita: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Status do chamado" />,
    content: (
      <div className="w-56 text-[14px] text-gray-700">
        Chamado #4821 aguardando retorno do cliente há 2 dias.
      </div>
    ),
    align: 'right',
  },
};

export const PosicaoTopo: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Organização" />,
    content: (
      <div className="w-56 text-[14px] text-gray-700">
        Organização ativa com faturamento quarteirizado habilitado.
      </div>
    ),
    position: 'top',
  },
};
