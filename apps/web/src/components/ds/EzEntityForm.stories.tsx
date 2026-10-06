import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzEntityForm, type EzEntityFormField } from './EzEntityForm';

/**
 * Aponta DS Entity Form — equivalente visual ao `snk-form` do catálogo
 * Sankhya DS, porém sem qualquer vínculo com SnkApplication/SnkDataUnit ou
 * com o Dicionário de Dados do ERP. Em vez de carregar campos
 * automaticamente da entidade, recebe um `schema` genérico via prop
 * (`fields`) e reaproveita os inputs já existentes do DS (EzTextInput,
 * EzNumberInput, EzDateInput, EzDateTimeInput, EzComboBox, EzTextArea,
 * EzCheck, EzRadioButton) de acordo com o `type` de cada campo.
 */
const meta: Meta<typeof EzEntityForm> = {
  title: 'DS/EzEntityForm',
  component: EzEntityForm,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzEntityForm>;

const CLIENTE_FIELDS: EzEntityFormField[] = [
  { name: 'razaoSocial', label: 'Razão social', type: 'text', required: true, colSpan: 2 },
  { name: 'cnpj', label: 'CNPJ', type: 'text', required: true },
  { name: 'ativo', label: 'Cliente ativo', type: 'checkbox' },
  {
    name: 'segmento',
    label: 'Segmento',
    type: 'select',
    options: [
      { label: 'Varejo', value: 'VAREJO' },
      { label: 'Indústria', value: 'INDUSTRIA' },
      { label: 'Serviços', value: 'SERVICOS' },
    ],
  },
  { name: 'faturamentoAnual', label: 'Faturamento anual (mil)', type: 'number' },
  { name: 'observacoes', label: 'Observações', type: 'textarea', colSpan: 2 },
];

export const CascataBasico: Story = {
  render: () => {
    function Demo() {
      const [values, setValues] = useState<Record<string, unknown>>({
        razaoSocial: '',
        cnpj: '',
      });
      return (
        <div className="w-[480px]">
          <EzEntityForm
            fields={[
              { name: 'razaoSocial', label: 'Razão social', type: 'text', required: true },
              { name: 'cnpj', label: 'CNPJ', type: 'text', required: true },
            ]}
            values={values}
            onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const LadoALadoComColSpan: Story = {
  render: () => {
    function Demo() {
      const [values, setValues] = useState<Record<string, unknown>>({
        razaoSocial: 'Refrigeração Mota Ltda',
        cnpj: '',
        ativo: true,
        segmento: 'INDUSTRIA',
        faturamentoAnual: 0,
        observacoes: '',
      });
      return (
        <div className="w-[700px]">
          <EzEntityForm
            layout="SIDE_BY_SIDE"
            fields={CLIENTE_FIELDS}
            values={values}
            onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const TodosOsTiposDeCampo: Story = {
  render: () => {
    function Demo() {
      const fields: EzEntityFormField[] = [
        { name: 'nome', label: 'Nome', type: 'text' },
        { name: 'quantidade', label: 'Quantidade', type: 'number' },
        { name: 'dataNascimento', label: 'Data de nascimento', type: 'date' },
        { name: 'criadoEm', label: 'Criado em', type: 'datetime' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: 'Aberto', value: 'ABERTO' },
            { label: 'Fechado', value: 'FECHADO' },
          ],
        },
        { name: 'observacao', label: 'Observação', type: 'textarea' },
        { name: 'notificar', label: 'Notificar por e-mail', type: 'checkbox' },
        {
          name: 'prioridade',
          label: 'Prioridade',
          type: 'radio',
          options: [
            { label: 'Baixa', value: 'BAIXA' },
            { label: 'Alta', value: 'ALTA' },
          ],
        },
      ];
      const [values, setValues] = useState<Record<string, unknown>>({
        nome: '',
        quantidade: 1,
        dataNascimento: '',
        criadoEm: '',
        status: '',
        observacao: '',
        notificar: false,
        prioridade: '',
      });
      return (
        <div className="w-[480px]">
          <EzEntityForm
            fields={fields}
            values={values}
            onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const ComErrosDeValidacao: Story = {
  args: {
    fields: [
      { name: 'razaoSocial', label: 'Razão social', type: 'text', required: true },
      { name: 'cnpj', label: 'CNPJ', type: 'text', required: true },
      { name: 'faturamentoAnual', label: 'Faturamento anual (mil)', type: 'number' },
    ],
    values: { razaoSocial: '', cnpj: '', faturamentoAnual: -5 },
    errors: {
      razaoSocial: 'Campo obrigatório.',
      cnpj: 'CNPJ inválido.',
      faturamentoAnual: 'O valor não pode ser negativo.',
    },
    onChange: () => undefined,
  },
};
