import type { Meta, StoryObj } from '@storybook/react-vite';
import { EzGridWrapper } from './EzGrid';
import { EzTag } from './EzTag';

/**
 * Aponta DS Grid (Table Wrapper) — casca visual para listas tabulares,
 * usada hoje em `ContractsPage`/`ReportsPage`. É este componente, e não
 * uma `<ul>` de cards, que deveria sustentar o "Modo Lista" de telas
 * como `OrganizationsPage` (#57) para respeitar o padrão Sankhya de
 * grade (equivalente ao `DataGrid`/`ez-data-grid` do ERP).
 */
const meta: Meta<typeof EzGridWrapper> = {
  title: 'DS/EzGridWrapper',
  component: EzGridWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzGridWrapper>;

const orgs = [
  { name: 'Refrigeração Mota', legalName: 'Mota Refrigeração Ltda', cnpj: '12.345.678/0001-90', active: true, clients: 1 },
  { name: 'SOCIAL DISTRIBUIDORA', legalName: 'Social Distribuidora Peças S.A.', cnpj: '98.765.432/0001-10', active: true, clients: 0 },
  { name: 'Cliente Inativo Ltda', legalName: 'Cliente Inativo Ltda', cnpj: '11.111.111/0001-11', active: false, clients: 0 },
];

/**
 * Referência de "como deveria ficar" o Modo Lista da tela de Organizações
 * — colunas Nome Fantasia / Razão Social / CNPJ / Status / Clientes,
 * em vez da lista simples de cards usada na primeira versão do #57.
 */
export const OrganizationsListReference: Story = {
  render: () => (
    <EzGridWrapper>
      <thead className="bg-gray-90">
        <tr>
          <th className="px-4 py-3 font-semibold text-gray-700">Nome Fantasia</th>
          <th className="px-4 py-3 font-semibold text-gray-700">Razão Social</th>
          <th className="px-4 py-3 font-semibold text-gray-700">CNPJ</th>
          <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
          <th className="px-4 py-3 font-semibold text-gray-700">Clientes</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {orgs.map((org) => (
          <tr key={org.name} className="hover:bg-gray-90">
            <td className="px-4 py-3 font-medium text-brand-700">{org.name}</td>
            <td className="px-4 py-3 text-gray-700">{org.legalName}</td>
            <td className="px-4 py-3 text-gray-700">{org.cnpj}</td>
            <td className="px-4 py-3">
              <EzTag label={org.active ? 'Ativo' : 'Inativo'} variant={org.active ? 'green' : 'gray'} />
            </td>
            <td className="px-4 py-3 text-gray-700">{org.clients}</td>
          </tr>
        ))}
      </tbody>
    </EzGridWrapper>
  ),
};

export const Empty: Story = {
  render: () => (
    <EzGridWrapper>
      <thead className="bg-gray-90">
        <tr>
          <th className="px-4 py-3 font-semibold text-gray-700">Nome Fantasia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="px-4 py-6 text-center text-gray-500">Nenhum registro encontrado.</td>
        </tr>
      </tbody>
    </EzGridWrapper>
  ),
};

export const ComScrollbarHorizontal: Story = {
  render: () => (
    <EzGridWrapper alwaysShowHorizontalScrollbar>
      <thead className="bg-gray-90">
        <tr>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[200px]">Nome Fantasia</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[250px]">Razão Social</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[200px]">CNPJ</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[150px]">Status</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[150px]">Clientes</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[200px]">Data Criação</th>
          <th className="px-4 py-3 font-semibold text-gray-700 min-w-[200px]">Responsável</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {orgs.map((org) => (
          <tr key={org.name} className="hover:bg-gray-90">
            <td className="px-4 py-3 font-medium text-brand-700">{org.name}</td>
            <td className="px-4 py-3 text-gray-700">{org.legalName}</td>
            <td className="px-4 py-3 text-gray-700">{org.cnpj}</td>
            <td className="px-4 py-3">
              <EzTag label={org.active ? 'Ativo' : 'Inativo'} variant={org.active ? 'green' : 'gray'} />
            </td>
            <td className="px-4 py-3 text-gray-700">{org.clients}</td>
            <td className="px-4 py-3 text-gray-700">01/01/2026</td>
            <td className="px-4 py-3 text-gray-700">Alfredo Maia</td>
          </tr>
        ))}
      </tbody>
    </EzGridWrapper>
  ),
};

