import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ticket } from 'lucide-react';
import { EzListItem } from './EzListItem';
import { EzScroller } from './EzScroller';
import { EzTag } from './EzTag';

/**
 * Aponta DS Scroller — container com scroll vertical de barra fina
 * customizada, útil para listas longas dentro de cards, modais e popovers.
 */
const meta: Meta<typeof EzScroller> = {
  title: 'DS/EzScroller',
  component: EzScroller,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzScroller>;

const chamados = Array.from({ length: 35 }, (_, i) => ({
  id: 4800 + i,
  titulo: `Chamado #${4800 + i} — ${[
    'Erro ao emitir nota fiscal',
    'Lentidão no faturamento',
    'Dúvida sobre quarteirizado',
    'Falha na integração Sankhya',
    'Atualização de contrato',
  ][i % 5]}`,
  cliente: ['Social Tecnologia', 'Refrigeração Mota', 'Empresa Social'][i % 3],
}));

export const Default: Story = {
  args: { maxHeight: 320 },
  render: (args) => (
    <div className="w-[440px] rounded-[12px] border border-gray-200 bg-white">
      <EzScroller {...args}>
        {chamados.map((c) => (
          <EzListItem
            key={c.id}
            icon={<Ticket size={18} />}
            title={c.titulo}
            subtitle={c.cliente}
            onClick={() => undefined}
          />
        ))}
      </EzScroller>
    </div>
  ),
};

export const AlturaEmViewport: Story = {
  args: { maxHeight: '50vh' },
  render: (args) => (
    <div className="w-[440px] rounded-[12px] border border-gray-200 bg-white">
      <EzScroller {...args}>
        {chamados.map((c) => (
          <EzListItem
            key={c.id}
            icon={<Ticket size={18} />}
            title={c.titulo}
            subtitle={c.cliente}
            onClick={() => undefined}
          />
        ))}
      </EzScroller>
    </div>
  ),
};

export const ComTagsDeStatus: Story = {
  render: () => (
    <div className="w-[480px] rounded-[12px] border border-gray-200 bg-white">
      <EzScroller maxHeight={360}>
        {chamados.map((c, i) => (
          <EzListItem
            key={c.id}
            icon={<Ticket size={18} />}
            title={c.titulo}
            subtitle={c.cliente}
            rightContent={
              <EzTag
                label={i % 4 === 0 ? 'Urgente' : i % 4 === 1 ? 'Em atendimento' : 'Aberto'}
                variant={i % 4 === 0 ? 'red' : i % 4 === 1 ? 'yellow' : 'ocean'}
              />
            }
            onClick={() => undefined}
          />
        ))}
      </EzScroller>
    </div>
  ),
};
