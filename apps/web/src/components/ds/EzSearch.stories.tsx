import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzSearch } from './EzSearch';

/**
 * Aponta DS Search (Autocomplete / Combobox)
 * Campo de busca com dropdown de opções, suporte a filtro local ou a um
 * `onSearchChange` para busca remota (debounce/paginação ficam por conta
 * de quem consome o componente), e um botão de limpar seleção. Usado para
 * selecionar cliente, organização ou atendente responsável em formulários
 * de chamados.
 */
const meta: Meta<typeof EzSearch> = {
  title: 'DS/EzSearch',
  component: EzSearch,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSearch>;

const clientOptions = [
  { label: 'Social Tecnologia', value: 'social-tecnologia' },
  { label: 'Hyundai BMC', value: 'hyundai-bmc' },
  { label: 'Mota Refrigeração', value: 'mota-refrigeracao' },
];

export const Default: Story = {
  args: {
    label: 'Cliente',
    placeholder: 'Buscar organização...',
    options: clientOptions,
    onChange: () => undefined,
  },
};

export const ComValorSelecionado: Story = {
  args: {
    label: 'Cliente',
    options: clientOptions,
    value: 'social-tecnologia',
    onChange: () => undefined,
  },
};

export const BuscaRemota: Story = {
  args: {
    label: 'Atendente responsável',
    placeholder: 'Digite para buscar na equipe...',
    options: [
      { label: 'Maria Silva', value: 'maria-silva' },
      { label: 'João Pereira', value: 'joao-pereira' },
    ],
    onChange: () => undefined,
    onSearchChange: () => undefined,
    message: 'A busca é feita no servidor enquanto você digita.',
  },
};

export const ComErro: Story = {
  args: {
    label: 'Organização',
    options: clientOptions,
    onChange: () => undefined,
    hasError: true,
    message: 'Selecione a organização do chamado.',
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'Cliente',
    options: clientOptions,
    value: 'hyundai-bmc',
    onChange: () => undefined,
    disabled: true,
  },
};

/**
 * Demo interativa: componente controlado (`value`/`onChange`), com o
 * estado de seleção mantido em React, como no formulário real de abertura
 * de chamado ao escolher a organização do cliente.
 */
export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<string | number | null>(null);
      return (
        <EzSearch
          label="Organização do chamado"
          placeholder="Buscar organização..."
          options={clientOptions}
          value={value}
          onChange={setValue}
        />
      );
    }
    return <Demo />;
  },
};
