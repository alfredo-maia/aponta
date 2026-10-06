import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzTaskbar } from './EzTaskbar';

/**
 * Aponta DS Taskbar — espelha o `snk-taskbar` do catálogo Sankhya DS.
 * Barra de botões de ação configurável via `buttons` (lista de
 * identificadores), sem nenhuma dependência de `SnkApplication`/`DataUnit`.
 * Suporta separadores (`DIVIDER`) e um menu de mais opções (`MORE_OPTIONS`).
 */
const meta: Meta<typeof EzTaskbar> = {
  title: 'DS/EzTaskbar',
  component: EzTaskbar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTaskbar>;

export const Default: Story = {
  args: {
    buttons: ['PREVIOUS', 'NEXT', 'DIVIDER', 'CLONE', 'REMOVE', 'DIVIDER', 'INSERT', 'SAVE'],
    onAction: () => undefined,
  },
};

export const ComPrimario: Story = {
  args: {
    buttons: ['PREVIOUS', 'NEXT', 'DIVIDER', 'INSERT', 'SAVE', 'CANCEL'],
    onAction: () => undefined,
    primaryButton: 'SAVE',
  },
};

export const ComMaisOpcoes: Story = {
  args: {
    buttons: ['PREVIOUS', 'NEXT', 'DIVIDER', 'CLONE', 'REMOVE', 'MORE_OPTIONS'],
    onAction: () => undefined,
    actionsList: [
      { label: 'Exportar seleção', onClick: () => undefined },
      { label: 'Imprimir', onClick: () => undefined },
      { label: 'Anexar arquivo', onClick: () => undefined },
    ],
  },
};

export const AlinhadoADireita: Story = {
  args: {
    buttons: ['GRID_MODE', 'CONFIGURATOR'],
    onAction: () => undefined,
    alignRight: true,
  },
};

export const ComBotaoDesabilitado: Story = {
  args: {
    buttons: ['PREVIOUS', 'NEXT', 'DIVIDER', 'REMOVE'],
    onAction: () => undefined,
    disabledButtons: ['REMOVE'],
  },
};
