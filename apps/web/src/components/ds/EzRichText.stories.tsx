import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzRichText } from './EzRichText';

/**
 * Aponta DS Rich Text Editor (Tiptap, inspirado no @sankhyalabs/ezui)
 * Editor de texto rico com barra de ferramentas (Negrito, Itálico,
 * Sublinhado, Listas, Link e Imagem) e um modo de Preview. Usado na
 * descrição detalhada de chamados e em respostas do atendente, onde é
 * importante permitir formatação (listas de passos, links para anexos,
 * trechos de log em destaque) sem exigir um editor de markdown.
 */
const meta: Meta<typeof EzRichText> = {
  title: 'DS/EzRichText',
  component: EzRichText,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzRichText>;

export const Default: Story = {
  args: {
    testId: 'rt-default',
    label: 'Descrição do chamado',
    value: '<p>Cliente relatou lentidão ao gerar relatórios no sistema de faturamento.</p>',
    onChange: () => undefined,
  },
};

export const ComMensagemDeErro: Story = {
  args: {
    testId: 'rt-erro',
    label: 'Descrição do chamado',
    value: '',
    onChange: () => undefined,
    hasError: true,
    message: 'Descrição é obrigatória para abrir o chamado.',
  },
};

export const Desabilitado: Story = {
  args: {
    testId: 'rt-disabled',
    label: 'Descrição do chamado',
    value: '<p>Chamado encerrado — SLA cumprido dentro do prazo contratado.</p>',
    onChange: () => undefined,
    disabled: true,
  },
};

export const SemLabel: Story = {
  args: {
    testId: 'rt-sem-label',
    value: '<p>Resposta interna visível apenas para a equipe de suporte.</p>',
    onChange: () => undefined,
  },
};

/**
 * Demo interativa: mantém o HTML do editor em estado React, assim como a
 * tela de novo chamado faz ao capturar `onChange` para montar o payload de
 * criação do ticket.
 */
export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(
        '<p>Descreva o problema reportado pelo cliente, incluindo horário e impacto no SLA.</p>'
      );
      return (
        <EzRichText
          testId="rt-interativo"
          label="Descrição do chamado"
          value={value}
          onChange={setValue}
          message="Visível para o cliente e para a equipe de suporte."
        />
      );
    }
    return <Demo />;
  },
};
