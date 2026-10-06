import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzPrintSelector } from './EzPrintSelector';

/**
 * Aponta DS Print Selector — espelha o comportamento visual do
 * `snk-print-selector` do catálogo Sankhya DS: um modal para escolher qual
 * impressora/modelo de impressão usar em um trabalho de impressão pendente,
 * com a opção "Usar sempre esta seleção" para memorizar a escolha como
 * padrão. Diferente do componente Sankhya original, este é inteiramente
 * genérico — sem dependência de `SnkApplication`/`DataUnit`/servidor de
 * impressão: o chamador fornece `options` e recebe `onPrint(optionId, remember)`.
 */
const meta: Meta<typeof EzPrintSelector> = {
  title: 'DS/EzPrintSelector',
  component: EzPrintSelector,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPrintSelector>;

const PRINTERS = [
  { id: 'printer-reception', label: 'Impressora Recepção' },
  { id: 'printer-finance', label: 'Impressora Financeiro' },
  { id: 'printer-pdf', label: 'PDF (CutePDF Writer)' },
];

export const Default: Story = {
  args: {
    isOpen: true,
    options: PRINTERS,
    onPrint: () => undefined,
  },
};

export const ComAcaoRealDeImpressao: Story = {
  name: 'Com window.print() como fallback',
  args: {
    isOpen: true,
    title: 'Selecionar impressora',
    options: PRINTERS,
    onPrint: (optionId: string, remember: boolean) => {
      // Exemplo de integração real: o componente em si só expõe `onPrint`;
      // a decisão de como efetivamente imprimir fica a cargo do chamador.
      console.info('Imprimindo em', optionId, 'memorizar:', remember);
      window.print();
    },
    onCancel: () => undefined,
  },
};

export const SemOpcoesDisponiveis: Story = {
  name: 'Sem impressoras disponíveis',
  args: {
    isOpen: true,
    title: 'Selecionar impressora',
    options: [],
    onPrint: () => undefined,
    onCancel: () => undefined,
  },
};

export const Fechado: Story = {
  args: {
    isOpen: false,
    options: PRINTERS,
    onPrint: () => undefined,
  },
};
