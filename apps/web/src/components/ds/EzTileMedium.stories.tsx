import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzTileMedium } from './EzTileMedium';

/**
 * Aponta DS Tile Medium — espelha o `ez-tile-medium` do catálogo Sankhya DS.
 * Card com ícone/avatar opcional, até 3 tags, título + descrição e botão de
 * ação opcional no rodapé. Único componente novo identificado na auditoria de
 * paridade com o catálogo Sankhya (os demais nomes "faltantes" já eram
 * atendidos por `EzTabs`, `EzMultiSelect` ou decisão arquitetural via
 * `EzGridWrapper`).
 */
const meta: Meta<typeof EzTileMedium> = {
  title: 'DS/EzTileMedium',
  component: EzTileMedium,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzTileMedium>;

export const Default: Story = {
  args: {
    smallTitleText: 'Contrato de manutenção',
    descriptionText: 'Plano mensal com SLA de 4h para chamados críticos.',
  },
};

export const ComIcone: Story = {
  args: {
    iconName: 'file-text',
    iconColor: '#1d7a6f',
    smallTitleText: 'Contrato de manutenção',
    descriptionText: 'Plano mensal com SLA de 4h para chamados críticos.',
  },
};

export const ComAvatar: Story = {
  args: {
    avatarProps: { name: 'Empresa Social', shape: 'circle' },
    smallTitleText: 'Social Tecnologia',
    descriptionText: 'Cliente desde 2021 — 12 contratos ativos.',
  },
};

export const ComTags: Story = {
  args: {
    iconName: 'building-2',
    smallTitleText: 'Organização ativa',
    descriptionText: 'Cliente com faturamento quarteirizado habilitado.',
    tags: [
      { label: 'Ativo', color: 'green' },
      { label: 'Quarteirizado', color: 'ocean' },
      { label: 'VIP', color: 'yellow' },
    ],
  },
};

export const ComBotao: Story = {
  args: {
    iconName: 'ticket',
    smallTitleText: 'Chamado #4821',
    descriptionText: 'Aguardando retorno do cliente há 2 dias.',
    buttonProps: { label: 'Ver chamado', onClick: () => undefined },
  },
};

export const Completo: Story = {
  args: {
    avatarProps: { name: 'Maria Silva', shape: 'circle' },
    tags: [
      { label: 'Urgente', color: 'red' },
      { label: 'Suporte', color: 'petroleum' },
    ],
    smallTitleText: 'Falha no servidor de produção',
    descriptionText: 'Cliente reportou indisponibilidade total do sistema desde 09h00. Equipe de infra já notificada.',
    buttonProps: { label: 'Assumir chamado', onClick: () => undefined },
  },
};

export const CorVermelha: Story = {
  args: {
    color: 'red',
    iconName: 'alert-triangle',
    smallTitleText: 'SLA em risco',
    descriptionText: 'Tempo de resposta acima do contratado.',
  },
};

export const CorCinza: Story = {
  args: {
    color: 'gray',
    smallTitleText: 'Contrato encerrado',
    descriptionText: 'Vigência finalizada em 31/12/2025.',
  },
};
