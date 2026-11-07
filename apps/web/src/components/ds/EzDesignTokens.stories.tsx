import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzDesignTokens } from './EzDesignTokens';

/**
 * Tokens de proporção (D6) fechados na fatia 1 da DMTE-427 — ADR
 * `0001-paleta-unica-brand-na-aba-tickets`. Altura de controle, raio e
 * sombra únicos para a aba Tickets, medidos a partir dos primitivos já
 * renderizados do DS, não valores novos inventados.
 */
const meta: Meta<typeof EzDesignTokens> = {
  title: 'DS/Tokens de proporção (D6)',
  component: EzDesignTokens,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzDesignTokens>;

export const Escala: Story = {};
