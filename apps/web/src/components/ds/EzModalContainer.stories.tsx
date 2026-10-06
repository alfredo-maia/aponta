import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzButton } from './EzButton';
import { EzModalContainer } from './EzModalContainer';

/**
 * Aponta DS Modal Container — wrapper de layout interno usado DENTRO de
 * `EzModal` para estruturar o conteúdo: cabeçalho (título + botão fechar),
 * corpo com padding e rodapé de ações. Não renderiza overlay/portal próprio.
 */
const meta: Meta<typeof EzModalContainer> = {
  title: 'DS/EzModalContainer',
  component: EzModalContainer,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzModalContainer>;

export const Default: Story = {
  args: {
    title: 'Detalhes do chamado #4821',
    onClose: () => undefined,
    children:
      'Cliente reportou erro ao emitir nota fiscal de serviço após a atualização do sistema. A equipe de suporte já reproduziu o problema no ambiente de homologação.',
  },
  render: (args) => (
    <div className="w-[560px] h-[320px]">
      <EzModalContainer {...args} />
    </div>
  ),
};

export const ComFooter: Story = {
  args: {
    title: 'Confirmar encerramento',
    onClose: () => undefined,
    children:
      'Deseja encerrar o chamado #4830? O cliente será notificado por e-mail e o chamado ficará disponível para reabertura por 7 dias.',
    footer: (
      <>
        <EzButton variant="tertiary" label="Cancelar" onClick={() => undefined} />
        <EzButton label="Encerrar chamado" onClick={() => undefined} />
      </>
    ),
  },
  render: (args) => (
    <div className="w-[520px] h-[280px]">
      <EzModalContainer {...args} />
    </div>
  ),
};

export const ConteudoLongo: Story = {
  args: {
    title: 'Histórico de interações',
    onClose: () => undefined,
    footer: <EzButton label="Adicionar interação" onClick={() => undefined} />,
    children: (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i}>
            <strong>06/10/2026 {String(9 + i).padStart(2, '0')}:00</strong> — Interação {i + 1}:
            retorno do analista de suporte sobre o chamado #4821 com orientações ao cliente.
          </p>
        ))}
      </div>
    ),
  },
  render: (args) => (
    <div className="w-[560px] h-[360px]">
      <EzModalContainer {...args} />
    </div>
  ),
};
