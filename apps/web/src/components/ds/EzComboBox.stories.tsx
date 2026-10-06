import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzComboBox } from './EzComboBox';

/**
 * Aponta DS Combo Box — `<select>` nativo com label, mensagem de ajuda e
 * estado de erro, seguindo o mesmo padrão visual dos demais campos do DS.
 * Usado para seleção de status de chamado, prioridade, organização e
 * responsável no helpdesk.
 */
const meta: Meta<typeof EzComboBox> = {
  title: 'DS/EzComboBox',
  component: EzComboBox,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzComboBox>;

export const Default: Story = {
  args: {
    id: 'combo-default',
    label: 'Status do chamado',
    onChange: () => undefined,
    children: (
      <>
        <option value="open">Aberto</option>
        <option value="in_progress">Em andamento</option>
        <option value="closed">Encerrado</option>
      </>
    ),
  },
};

export const ComMensagem: Story = {
  args: {
    id: 'combo-message',
    label: 'Prioridade',
    message: 'Define o SLA aplicado ao chamado',
    onChange: () => undefined,
    children: (
      <>
        <option value="low">Baixa</option>
        <option value="medium">Média</option>
        <option value="high">Alta — SLA 4h</option>
      </>
    ),
  },
};

export const ComErro: Story = {
  args: {
    id: 'combo-error',
    label: 'Organização',
    hasError: true,
    message: 'Selecione uma organização para continuar',
    required: true,
    onChange: () => undefined,
    children: (
      <>
        <option value="">Selecione...</option>
        <option value="org-1">Social Tecnologia</option>
        <option value="org-2">Organização Alfa</option>
      </>
    ),
  },
};

export const Desabilitado: Story = {
  args: {
    id: 'combo-disabled',
    label: 'Responsável',
    disabled: true,
    onChange: () => undefined,
    children: (
      <>
        <option value="tech-1">Maria Silva</option>
        <option value="tech-2">João Pereira</option>
      </>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('in_progress');
      return (
        <div className="flex flex-col gap-2">
          <EzComboBox
            id="combo-interactive"
            label="Status do chamado"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="open">Aberto</option>
            <option value="in_progress">Em andamento</option>
            <option value="closed">Encerrado</option>
          </EzComboBox>
          <span className="text-[12px] text-gray-500">Selecionado: {value}</span>
        </div>
      );
    }
    return <Demo />;
  },
};
