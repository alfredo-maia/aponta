import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzLayoutFormConfig } from './EzLayoutFormConfig';

/**
 * Aponta DS Layout Form Config — espelha o `snk-layout-form-config` do
 * catálogo Sankhya DS. Toggle visual para escolher entre o layout em
 * cascata (campos um abaixo do outro) e o layout lado a lado (campos
 * ajustando-se horizontalmente à largura da tela), com preview simples de
 * cada opção. Diferente do componente original do Sankhya, este não
 * depende de singleton global nem de persistência server-side por tela:
 * o callback `onChange` é suficiente e quem usa decide onde (e se)
 * persistir a escolha.
 */
const meta: Meta<typeof EzLayoutFormConfig> = {
  title: 'DS/EzLayoutFormConfig',
  component: EzLayoutFormConfig,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzLayoutFormConfig>;

export const Default: Story = {
  args: {
    onChange: () => undefined,
  },
};

export const CascataSelecionada: Story = {
  args: {
    defaultLayout: 'CASCADE',
    onChange: () => undefined,
  },
};

export const LadoALadoSelecionado: Story = {
  args: {
    defaultLayout: 'SIDE_BY_SIDE',
    onChange: () => undefined,
  },
};
