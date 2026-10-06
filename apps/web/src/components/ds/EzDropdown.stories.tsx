import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown, Pencil, Trash2, UserPlus } from 'lucide-react';
import { EzButton } from './EzButton';
import { EzDropdown } from './EzDropdown';

/**
 * Aponta DS Dropdown — menu nativo leve (sem libs pesadas) exibido a partir
 * de um trigger qualquer (botão, avatar, texto). Suporta opções com ícone,
 * estado desabilitado e variante "danger" para ações destrutivas, além de
 * alinhamento à esquerda ou à direita do trigger.
 */
const meta: Meta<typeof EzDropdown> = {
  title: 'DS/EzDropdown',
  component: EzDropdown,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDropdown>;

export const Default: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Ações" rightIcon={ChevronDown} />,
    options: [
      { label: 'Editar chamado', onClick: () => undefined },
      { label: 'Atribuir responsável', onClick: () => undefined },
      { label: 'Encerrar chamado', onClick: () => undefined },
    ],
  },
};

export const ComIcones: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Chamado #4821" rightIcon={ChevronDown} />,
    options: [
      { label: 'Editar', icon: <Pencil size={16} />, onClick: () => undefined },
      { label: 'Atribuir a outro analista', icon: <UserPlus size={16} />, onClick: () => undefined },
      { label: 'Excluir', icon: <Trash2 size={16} />, onClick: () => undefined, danger: true },
    ],
  },
};

export const ComOpcaoDesabilitada: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Organização" rightIcon={ChevronDown} />,
    options: [
      { label: 'Ver detalhes', onClick: () => undefined },
      { label: 'Editar contrato', onClick: () => undefined, disabled: true },
      { label: 'Remover organização', onClick: () => undefined, danger: true },
    ],
  },
};

export const AlinhadoADireita: Story = {
  args: {
    trigger: <EzButton variant="tertiary" label="Mais opções" rightIcon={ChevronDown} />,
    align: 'right',
    options: [
      { label: 'Exportar chamados', onClick: () => undefined },
      { label: 'Configurar SLA', onClick: () => undefined },
    ],
  },
};

export const Desabilitado: Story = {
  args: {
    trigger: <EzButton variant="secondary" label="Sem permissão" rightIcon={ChevronDown} />,
    disabled: true,
    options: [{ label: 'Encerrar chamado', onClick: () => undefined }],
  },
};
