import { seedServiceCatalog, CatalogSeedData } from './seed-catalog';
import { readFileSync } from 'fs';
import { join } from 'path';

const raw = readFileSync(join(__dirname, 'seeds/catalogo-atendimento.json'), 'utf8');
const data = JSON.parse(raw) as CatalogSeedData;

type Row = Record<string, any>;

function fakePrisma(desks: string[] = ['Suporte Geral'], preset: { categories?: Row[] } = {}) {
  const state = {
    categories: [...(preset.categories ?? [])] as Row[],
    items: [] as Row[],
    writes: 0,
  };
  let seq = 0;
  const table = (rows: Row[]) => ({
    findFirst: async ({ where }: { where: Row }) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    create: async ({ data: d }: { data: Row }) => {
      state.writes++;
      const row = { id: `id-${++seq}`, ...d };
      rows.push(row);
      return row;
    },
    update: async ({ where, data: d }: { where: Row; data: Row }) => {
      state.writes++;
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, d);
      return row;
    },
  });
  const deskRows = desks.map((name, i) => ({ id: `desk-${i}`, name }));
  const prisma = {
    serviceDesk: { findFirst: async ({ where }: { where: Row }) => deskRows.find((d) => d.name === where.name) ?? null },
    serviceCatalogCategory: table(state.categories),
    serviceCatalogItem: table(state.items),
  };
  return { prisma, state };
}

describe('seedServiceCatalog (DMTE-456)', () => {
  it('AC-01: creates the 8 categories and 18 items with title, description, priority, icon and desk', async () => {
    const { prisma, state } = fakePrisma();
    await seedServiceCatalog(prisma, data, 'Suporte Geral');
    expect(state.categories).toHaveLength(8);
    expect(state.items).toHaveLength(18);
    const nf = state.items.find((i) => i.title === 'Nota Fiscal')!;
    const fiscal = state.categories.find((c) => c.name === 'Fiscal e Notas Fiscais')!;
    expect(nf).toMatchObject({
      categoryId: fiscal.id,
      defaultServiceDeskId: 'desk-0',
      defaultPriority: 'HIGH',
      icon: '🧾',
    });
    expect(nf.description).toContain('Número da nota');
  });

  it('AC-02: a second run creates nothing new and repairs edited fields', async () => {
    const { prisma, state } = fakePrisma();
    await seedServiceCatalog(prisma, data, 'Suporte Geral');
    state.items.find((i) => i.title === 'Treinamento')!.defaultPriority = 'CRITICAL';
    await seedServiceCatalog(prisma, data, 'Suporte Geral');
    expect(state.categories).toHaveLength(8);
    expect(state.items).toHaveLength(18);
    expect(state.items.find((i) => i.title === 'Treinamento')!.defaultPriority).toBe('MEDIUM');
  });

  it('AC-03: a missing service desk aborts before any write', async () => {
    const { prisma, state } = fakePrisma(['Outra Mesa']);
    await expect(seedServiceCatalog(prisma, data, 'Suporte Geral')).rejects.toThrow('Suporte Geral');
    expect(state.writes).toBe(0);
  });

  it('AC-03: an invalid priority aborts before any write', async () => {
    const { prisma, state } = fakePrisma();
    const bad = { items: [{ ...data.items[0], default_priority: 'URGENT' }] };
    await expect(seedServiceCatalog(prisma, bad, 'Suporte Geral')).rejects.toThrow('URGENT');
    expect(state.writes).toBe(0);
  });

  it('AC-05: categories outside the JSON are left untouched', async () => {
    const legacy = { id: 'cat-hw', name: 'Hardware', description: 'x', isActive: true };
    const { prisma, state } = fakePrisma(['Suporte Geral'], { categories: [{ ...legacy }] });
    await seedServiceCatalog(prisma, data, 'Suporte Geral');
    expect(state.categories.find((c) => c.id === 'cat-hw')).toEqual(legacy);
  });
});

describe('catalogo-atendimento.json (DMTE-456)', () => {
  it('AC-04: has 8 categories, 18 items, no examples and only valid priorities', () => {
    expect(new Set(data.items.map((i) => i.macro_category)).size).toBe(8);
    expect(data.items).toHaveLength(18);
    expect(raw).not.toContain('examples');
    for (const i of data.items) {
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(i.default_priority);
    }
  });
});

describe('catalogo-atendimento.json (DMTE-484)', () => {
  it('AC-01: no item description mentions SAB or Zydon', () => {
    for (const i of data.items) {
      expect(i.item_description).not.toMatch(/\bSAB\b|zydon/i);
    }
  });

  it('AC-02: keeps the 18 items with the same titles, priorities and icons', () => {
    expect(data.items.map((i) => [i.macro_category, i.item_title, i.default_priority, i.icon])).toEqual([
      ['Fiscal e Notas Fiscais', 'Nota Fiscal', 'HIGH', '🧾'],
      ['Sistemas e Acessos', 'Acessos, Usuários, Permissões e Segurança', 'HIGH', '🔐'],
      ['Sistemas e Acessos', 'Erros de Sistema / Bugs / Travamentos / Lentidão', 'HIGH', '🐞'],
      ['Fiscal e Notas Fiscais', 'Fiscal / Contábil / Tributário', 'HIGH', '📑'],
      ['Comercial e Vendas', 'Vendas / Pedido de Venda / Faturamento / Portal B2B', 'HIGH', '🛒'],
      ['Apoio Geral', 'Ajustes / Configurações Gerais', 'MEDIUM', '⚙️'],
      ['Sistemas e Acessos', 'Automação, Integração e APIs', 'MEDIUM', '🔌'],
      ['Relatórios e Customizações', 'Relatórios, Dashboards e Impressões', 'MEDIUM', '📊'],
      ['Relatórios e Customizações', 'Customização / Parametrização', 'MEDIUM', '🛠️'],
      ['Operações e Estoque', 'Estoque / Inventário / Picking / Romaneio / PDV', 'MEDIUM', '📦'],
      ['Financeiro', 'Financeiro', 'MEDIUM', '💰'],
      ['Comercial e Vendas', 'Cadastros', 'MEDIUM', '🗂️'],
      ['Comercial e Vendas', 'Compras / Pedido de Compra / Entrada de Nota', 'MEDIUM', '🛍️'],
      ['Relatórios e Customizações', 'Importação de Dados / Planilhas', 'MEDIUM', '📥'],
      ['Sistemas e Acessos', 'Infraestrutura / Atualização de Sistema', 'MEDIUM', '🖥️'],
      ['Financeiro', 'Custo de Produto', 'MEDIUM', '🏷️'],
      ['Atendimento e Treinamento', 'Atendimento Presencial / Visita / Agenda', 'MEDIUM', '📅'],
      ['Atendimento e Treinamento', 'Treinamento', 'MEDIUM', '🎓'],
    ]);
  });
});
