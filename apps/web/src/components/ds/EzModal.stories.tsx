import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzButton } from './EzButton';
import { EzModal } from './EzModal';

/**
 * Aponta DS Modal (Dialog) — diálogo em portal com overlay, cabeçalho
 * (título + botão fechar), corpo com scroll e rodapé de ações opcional.
 * Fecha ao clicar fora, pressionar Esc, ou via `preventOutsideClose` para
 * exigir confirmação explícita. Controlado via `isOpen`/`onClose`.
 */
const meta: Meta<typeof EzModal> = {
  title: 'DS/EzModal',
  component: EzModal,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzModal>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Detalhes do chamado #4821',
    children:
      'Cliente reportou erro ao emitir nota fiscal de serviço após a atualização do sistema. A equipe de suporte já reproduziu o problema no ambiente de homologação.',
  },
};

export const ComFooter: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Confirmar encerramento',
    maxWidth: 'sm',
    children:
      'Deseja encerrar o chamado #4830? O cliente será notificado por e-mail e o chamado ficará disponível para reabertura por 7 dias.',
    footer: (
      <>
        <EzButton variant="tertiary" label="Cancelar" onClick={() => undefined} />
        <EzButton label="Encerrar chamado" onClick={() => undefined} />
      </>
    ),
  },
};

export const PreventOutsideClose: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Transferência interestadual',
    preventOutsideClose: true,
    maxWidth: 'lg',
    children:
      'Esta operação envolve emissão fiscal entre organizações de estados diferentes. Confirme os dados antes de prosseguir — clicar fora do modal não o fechará.',
    footer: <EzButton label="Confirmar transferência" onClick={() => undefined} />,
  },
};

export const LarguraCompleta: Story = {
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: 'Histórico de interações — Chamado #4821',
    maxWidth: '2xl',
    children: (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <p key={i}>
            <strong>06/10/2026 {String(9 + i).padStart(2, '0')}:00</strong> — Interação {i + 1}: retorno do
            analista de suporte sobre o chamado com orientações ao cliente.
          </p>
        ))}
      </div>
    ),
    footer: <EzButton label="Adicionar interação" onClick={() => undefined} />,
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <EzButton label="Abrir chamado #4821" onClick={() => setIsOpen(true)} />
          <EzModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Chamado #4821 — Erro ao emitir nota fiscal"
            footer={
              <>
                <EzButton variant="tertiary" label="Fechar" onClick={() => setIsOpen(false)} />
                <EzButton label="Assumir chamado" onClick={() => setIsOpen(false)} />
              </>
            }
          >
            Cliente reportou erro ao emitir nota fiscal de serviço. Aguardando retorno do time de infraestrutura.
          </EzModal>
        </>
      );
    }
    return <Demo />;
  },
};
