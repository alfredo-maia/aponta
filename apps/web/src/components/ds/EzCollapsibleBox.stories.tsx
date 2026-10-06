import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzCollapsibleBox } from './EzCollapsibleBox';

/**
 * Aponta DS Collapsible Box — caixa com cabeçalho clicável que expande /
 * recolhe o conteúdo, usada para seções densas como detalhes do contrato
 * e histórico do chamado.
 */
const meta: Meta<typeof EzCollapsibleBox> = {
  title: 'DS/EzCollapsibleBox',
  component: EzCollapsibleBox,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzCollapsibleBox>;

export const Default: Story = {
  args: {
    title: 'Detalhes do contrato #112',
    children: 'Plano mensal de suporte com SLA de 4h para chamados críticos. Vigência: 01/01/2026 a 31/12/2026.',
  },
};

export const AbertoPorPadrao: Story = {
  args: {
    title: 'Histórico do chamado #4821',
    defaultOpen: true,
    children: '04/10 09h12 — Chamado aberto pelo cliente. 04/10 10h05 — Técnico designado. 05/10 14h40 — Aguardando retorno do cliente.',
  },
};

export const ConteudoRico: Story = {
  args: {
    title: 'SLA e contatos do cliente',
    defaultOpen: true,
    children: (
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>SLA de resposta: 4h úteis</li>
        <li>Contato principal: Maria Silva — (11) 98888-1234</li>
        <li>Contato financeiro: João Souza — (11) 97777-4321</li>
      </ul>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      return (
        <div className="flex flex-col gap-2 w-full max-w-[480px]">
          <EzCollapsibleBox title="Dados do cliente">
            Social Tecnologia LTDA — CNPJ 12.345.678/0001-90. Cliente ativo desde 2021, com 12 contratos vigentes.
          </EzCollapsibleBox>
          <EzCollapsibleBox title="Chamados em aberto (3)">
            #4830 — Impressora fiscal sem comunicação. #4821 — Servidor de produção instável. #4815 — Troca de toner preventiva.
          </EzCollapsibleBox>
        </div>
      );
    }
    return <Demo />;
  },
};
