import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EzPagination } from './EzPagination';

/**
 * Aponta DS Pagination — navegação entre páginas com janela deslizante de
 * números em torno da página atual, usando "..." para intervalos omitidos.
 * Componente apenas emite eventos via `onChange`; não controla o próprio
 * estado, permitindo que o componente pai sincronize com parâmetros de URL
 * (ex.: listagens de chamados, clientes e organizações).
 */
const meta: Meta<typeof EzPagination> = {
  title: 'DS/EzPagination',
  component: EzPagination,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof EzPagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 5,
    onChange: () => undefined,
  },
};

export const PaginaIntermediaria: Story = {
  args: {
    currentPage: 4,
    totalPages: 10,
    onChange: () => undefined,
  },
};

export const MuitasPaginas: Story = {
  args: {
    currentPage: 12,
    totalPages: 40,
    onChange: () => undefined,
  },
};

export const UltimaPagina: Story = {
  args: {
    currentPage: 8,
    totalPages: 8,
    onChange: () => undefined,
  },
};

export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [page, setPage] = useState(1);
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700">
            Listagem de chamados — página {page} de 15
          </p>
          <EzPagination currentPage={page} totalPages={15} onChange={setPage} />
        </div>
      );
    }
    return <Demo />;
  },
};
