import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzGuideNavigator } from './EzGuideNavigator';

/**
 * Aponta DS Guide Navigator — navegador de etapas tipo wizard: passos
 * numerados conectados por linha, etapa atual destacada em brand-600 e
 * etapas concluídas com check. Usado em fluxos guiados como abertura de
 * chamado e cadastro de organização.
 */
const meta: Meta<typeof EzGuideNavigator> = {
  title: 'DS/EzGuideNavigator',
  component: EzGuideNavigator,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzGuideNavigator>;

const stepsAberturaChamado = [
  { id: 'dados', label: 'Dados do cliente' },
  { id: 'produto', label: 'Produto' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'revisao', label: 'Revisão' },
];

export const Default: Story = {
  args: {
    steps: stepsAberturaChamado,
    currentStep: 2,
    onStepClick: () => undefined,
  },
};

export const PrimeiraEtapa: Story = {
  args: {
    steps: stepsAberturaChamado,
    currentStep: 0,
  },
};

export const UltimaEtapa: Story = {
  args: {
    steps: [
      { id: 'org', label: 'Organização' },
      { id: 'contato', label: 'Contato' },
      { id: 'contrato', label: 'Contrato' },
    ],
    currentStep: 2,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [current, setCurrent] = useState(1);
      return (
        <EzGuideNavigator
          steps={stepsAberturaChamado}
          currentStep={current}
          onStepClick={(index) => setCurrent(index)}
        />
      );
    }
    return <Demo />;
  },
};
