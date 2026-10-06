import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzMultiSelect } from './EzMultiSelect';

/**
 * Aponta DS Multi Select — combobox que permite selecionar múltiplas opções
 * de uma lista, exibindo os valores escolhidos como tags removíveis dentro
 * do próprio campo. Suporta busca local (filtro no `label`) ou busca remota
 * via `onSearchChange`, além dos estados de erro e desabilitado.
 */
const meta: Meta<typeof EzMultiSelect> = {
  title: 'DS/EzMultiSelect',
  component: EzMultiSelect,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzMultiSelect>;

const categoriasDeChamado = [
  { label: 'Nota fiscal de serviço', value: 'nf' },
  { label: 'Faturamento quarteirizado', value: 'fat' },
  { label: 'Estoque e suprimentos', value: 'est' },
  { label: 'Financeiro / cobrança', value: 'fin' },
  { label: 'Relatórios gerenciais', value: 'rel' },
];

export const Default: Story = {
  args: {
    label: 'Categorias do chamado',
    placeholder: 'Selecione as categorias...',
    options: categoriasDeChamado,
    value: [],
    onChange: () => undefined,
  },
};

export const ComValoresSelecionados: Story = {
  args: {
    label: 'Categorias do chamado',
    options: categoriasDeChamado,
    value: ['nf', 'fin'],
    onChange: () => undefined,
  },
};

export const ComErro: Story = {
  args: {
    label: 'Organizações autorizadas',
    options: categoriasDeChamado,
    value: [],
    onChange: () => undefined,
    hasError: true,
    message: 'Selecione ao menos uma categoria para o SLA.',
    required: true,
  },
};

export const Desabilitado: Story = {
  args: {
    label: 'Categorias do chamado',
    options: categoriasDeChamado,
    value: ['fat', 'est'],
    disabled: true,
  },
};

export const Interativo: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState<(string | number)[]>(['fin']);
      return (
        <div className="w-[360px]">
          <EzMultiSelect
            label="Categorias do chamado"
            options={categoriasDeChamado}
            value={value}
            onChange={setValue}
            message={`${value.length} categoria(s) selecionada(s)`}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
