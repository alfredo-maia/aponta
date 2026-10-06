import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzTagInput } from './EzTagInput';

/**
 * Aponta DS Tag Input — campo de texto que transforma o conteúdo digitado em
 * tags removíveis (Enter adiciona, X remove). Usado para marcadores de
 * chamado e listas de e-mails em cópia.
 */
const meta: Meta<typeof EzTagInput> = {
  title: 'DS/EzTagInput',
  component: EzTagInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTagInput>;

export const Default: Story = {
  args: {
    id: 'tag-input-default',
    tags: ['Urgente', 'Hardware'],
    onChange: () => undefined,
  },
};

export const ComLabel: Story = {
  args: {
    id: 'tag-input-label',
    label: 'Marcadores do chamado',
    tags: ['SLA 4h', 'Cliente VIP'],
    onChange: () => undefined,
  },
};

export const Vazio: Story = {
  args: {
    id: 'tag-input-vazio',
    label: 'E-mails em cópia',
    tags: [],
    onChange: () => undefined,
    placeholder: 'Adicionar e-mail e pressionar Enter...',
  },
};

export const Disabled: Story = {
  args: {
    id: 'tag-input-disabled',
    label: 'Marcadores do chamado',
    tags: ['Encerrado'],
    onChange: () => undefined,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [tags, setTags] = useState<string[]>(['Urgente', 'Hardware']);
      return (
        <EzTagInput
          id="tag-input-interactive"
          label="Marcadores do chamado"
          tags={tags}
          onChange={setTags}
          placeholder="Adicionar marcador..."
        />
      );
    }
    return <Demo />;
  },
};
