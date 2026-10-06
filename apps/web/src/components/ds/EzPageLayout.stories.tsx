import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzPageHeader, EzPageLayout } from './EzPageLayout';
import { EzButton } from './EzButton';
import { EzCardItem } from './EzCardItem';

/**
 * Aponta DS Page Header — puxa o padrão visual do ERP Sankhya de
 * alternância **Modo Lista / Modo Formulário** (ver ícones `LayoutList` /
 * `AppWindow`). É o componente usado pela tela de Organizações (#57) para
 * substituir o antigo padrão lista+modal: a mesma rota alterna entre uma
 * grade (Modo Lista) e um formulário em tela cheia (Modo Formulário),
 * assim como no Sankhya o usuário alterna entre a Grade e a Edição de um
 * registro sem navegar para outra URL.
 */
const meta: Meta<typeof EzPageHeader> = {
  title: 'DS/EzPageHeader',
  component: EzPageHeader,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPageHeader>;

export const ListMode: Story = {
  args: {
    title: 'Empresas (Organizações)',
    activeMode: 'list',
    actions: <EzButton label="Novo Cliente" size="small" />,
  },
};

export const FormMode: Story = {
  args: {
    title: 'Empresas (Organizações)',
    activeMode: 'form',
    showBackButton: true,
  },
};

/**
 * Demo interativa: alterna de fato entre Lista e Formulário clicando no
 * toggle, exatamente como a `OrganizationsPage` real faz com
 * `useState<'list' | 'form'>`.
 */
export const InteractiveListFormToggle: Story = {
  render: () => {
    function Demo() {
      const [mode, setMode] = useState<'list' | 'form'>('list');
      return (
        <EzPageLayout
          header={
            <EzPageHeader
              title="Empresas (Organizações)"
              activeMode={mode}
              onModeChange={setMode}
              showBackButton={mode === 'form'}
              onBack={() => setMode('list')}
              actions={mode === 'list' ? <EzButton label="Novo Cliente" size="small" /> : undefined}
            />
          }
        >
          {mode === 'list' ? (
            <EzCardItem flat className="p-4">
              Modo Lista: aqui entraria o EzGridWrapper tabular (ver story
              DS/EzGrid) com Nome Fantasia / Razão Social / CNPJ / Status.
            </EzCardItem>
          ) : (
            <EzCardItem flat className="p-4">
              Modo Formulário: painel de edição em tela cheia do registro
              selecionado (ou cadastro de um novo).
            </EzCardItem>
          )}
        </EzPageLayout>
      );
    }
    return <Demo />;
  },
};
