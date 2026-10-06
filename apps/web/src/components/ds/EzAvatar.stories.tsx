import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzAvatar } from './EzAvatar';

/**
 * Aponta DS Avatar
 * Renderiza a imagem de um usuário/cliente ou, na ausência dela, suas
 * iniciais extraídas do nome. Suporta formato circular ou quadrado e
 * tamanho customizável. Usado em listas de chamados, cards de organização
 * e indicação de responsável/técnico.
 */
const meta: Meta<typeof EzAvatar> = {
  title: 'DS/EzAvatar',
  component: EzAvatar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzAvatar>;

export const ComIniciais: Story = {
  args: {
    name: 'João Silva',
  },
};

export const ComImagem: Story = {
  args: {
    name: 'Maria Souza',
    src: 'https://i.pravatar.cc/150?img=47',
  },
};

export const Quadrado: Story = {
  args: {
    name: 'Social Tecnologia',
    shape: 'square',
  },
};

export const Pequeno: Story = {
  args: {
    name: 'Técnico de Suporte',
    size: 24,
  },
};

export const Grande: Story = {
  args: {
    name: 'Organização Cliente',
    size: 64,
  },
};

export const SemNome: Story = {
  args: {},
};
