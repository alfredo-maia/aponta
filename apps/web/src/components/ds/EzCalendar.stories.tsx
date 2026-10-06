import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzCalendar } from './EzCalendar';

/**
 * Aponta DS Calendar — grade mensal simples com navegação entre meses,
 * usada no agendamento de visitas técnicas e filtros de período.
 */
const meta: Meta<typeof EzCalendar> = {
  title: 'DS/EzCalendar',
  component: EzCalendar,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzCalendar>;

export const Default: Story = {};

export const ComDataSelecionada: Story = {
  args: {
    value: new Date(2026, 9, 6),
    onSelectDate: () => undefined,
  },
};

export const MesAnterior: Story = {
  args: {
    value: new Date(2026, 8, 15),
    onChange: () => undefined,
    onSelectDate: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [selected, setSelected] = useState<Date>(new Date(2026, 9, 6));
      return (
        <div className="flex flex-col gap-3">
          <EzCalendar value={selected} onSelectDate={(date) => setSelected(date)} />
          <p className="text-[13px] text-gray-700">
            Visita técnica agendada para: {selected.toLocaleDateString('pt-BR')}
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};
