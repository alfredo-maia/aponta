import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzSelect } from './EzSelect';

/**
 * Aponta DS Select — escolha única com lista própria (a lista nativa do
 * navegador não é estilizável). Mantém um `<select>` nativo escondido para
 * formulário e testes. Teclado: setas, Home, End, Enter e Esc.
 */
const meta: Meta<typeof EzSelect> = {
  title: 'DS/EzSelect',
  component: EzSelect,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzSelect>;

const statuses = (
  <>
    <option value="OPEN">Aberto</option>
    <option value="IN_PROGRESS">Em Andamento</option>
    <option value="PENDING_CUSTOMER">Aguardando Cliente</option>
    <option value="ON_HOLD">Aguardando Terceiros</option>
    <option value="PENDING_SANKHYA">Aguardando Sankhya</option>
    <option value="PENDING_APPROVAL">Aguardando Aprovação</option>
    <option value="ESCALATED">Escalonado</option>
    <option value="RESOLVED">Resolvido</option>
    <option value="CLOSED">Fechado</option>
  </>
);

export const Default: Story = {
  args: { id: 'sel-default', label: 'Status', defaultValue: 'IN_PROGRESS', children: statuses },
};

export const Selecionado: Story = {
  args: { id: 'sel-selected', label: 'Status', defaultValue: 'PENDING_SANKHYA', children: statuses },
};

function ControladoExemplo() {
  const [value, setValue] = useState('OPEN');
  return (
    <EzSelect id="sel-controlled" label="Status" value={value} onChange={(e) => setValue(e.target.value)}>
      {statuses}
    </EzSelect>
  );
}

export const Controlado: Story = {
  render: () => <ControladoExemplo />,
};

export const Desabilitado: Story = {
  args: { id: 'sel-disabled', label: 'Status', defaultValue: 'CLOSED', disabled: true, children: statuses },
};

export const ComErro: Story = {
  args: {
    id: 'sel-error',
    label: 'Status',
    defaultValue: 'OPEN',
    hasError: true,
    message: 'Escolha um status válido',
    children: statuses,
  },
};

export const Classico: Story = {
  args: { id: 'sel-classic', label: 'Status', variant: 'classic', defaultValue: 'OPEN', children: statuses },
};

export const ListaLonga: Story = {
  args: {
    id: 'sel-long',
    label: 'Cliente',
    defaultValue: 'c1',
    children: (
      <>
        {Array.from({ length: 40 }, (_, i) => (
          <option key={i} value={`c${i + 1}`}>
            Cliente {i + 1}
          </option>
        ))}
      </>
    ),
  },
};
