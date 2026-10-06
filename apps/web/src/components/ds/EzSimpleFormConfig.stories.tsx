import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  EzSimpleFormConfig,
  type EzSimpleFormConfigValue,
} from './EzSimpleFormConfig';

/**
 * Aponta DS Simple Form Config — espelha o `snk-simple-form-config` do
 * catálogo Sankhya DS. Painel para escolher quais campos aparecem no
 * formulário e em qual aba/grupo cada campo fica (mesma forma do
 * `formConfig.fields` usado pelo `SnkSimpleCrud`: `{ name, tab }[]`).
 * Diferente do componente original do Sankhya, este não depende de
 * `SnkApplication`/`DataUnit`/persistência server-side por `configName`:
 * quem usa controla o estado via `value`/`onChange` e decide onde (e se)
 * persistir a configuração.
 */
const meta: Meta<typeof EzSimpleFormConfig> = {
  title: 'DS/EzSimpleFormConfig',
  component: EzSimpleFormConfig,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSimpleFormConfig>;

const availableFields = [
  { name: 'razaoSocial', label: 'Razão Social' },
  { name: 'cnpj', label: 'CNPJ' },
  { name: 'email', label: 'E-mail' },
  { name: 'telefone', label: 'Telefone' },
];

const initialValue: EzSimpleFormConfigValue[] = [
  { name: 'razaoSocial', tab: 'Geral', visible: true },
  { name: 'cnpj', tab: 'Geral', visible: true },
  { name: 'email', tab: 'Contato', visible: true },
  { name: 'telefone', tab: 'Contato', visible: false },
];

export const Default: Story = {
  args: {
    availableFields,
    value: initialValue,
    tabs: ['Geral', 'Contato'],
    onChange: () => undefined,
  },
};

export const SemAbasPersonalizadas: Story = {
  args: {
    availableFields,
    value: availableFields.map((field) => ({
      name: field.name,
      tab: 'Geral',
      visible: true,
    })),
    onChange: () => undefined,
  },
};

export const ComAcoesSalvarCancelar: Story = {
  args: {
    availableFields,
    value: initialValue,
    tabs: ['Geral', 'Contato'],
    onChange: () => undefined,
    onSave: () => undefined,
    onCancel: () => undefined,
  },
};

function Demo() {
  const [config, setConfig] = useState<EzSimpleFormConfigValue[]>(initialValue);

  return (
    <EzSimpleFormConfig
      availableFields={availableFields}
      value={config}
      tabs={['Geral', 'Contato']}
      onChange={setConfig}
      onSave={() => alert(JSON.stringify(config))}
      onCancel={() => setConfig(initialValue)}
    />
  );
}

export const Interativo: Story = {
  render: () => <Demo />,
};
