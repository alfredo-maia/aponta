import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { EzSimpleCrud } from './EzSimpleCrud';
import type { EzEntityFormField } from './EzEntityForm';

type Ticket = {
  id: string;
  title: string;
  priority: string;
};

const columns: ColumnDef<Ticket>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'priority', header: 'Prioridade' },
];

const fields: EzEntityFormField[] = [
  { name: 'title', label: 'Título', type: 'text' },
  { name: 'priority', label: 'Prioridade', type: 'text' },
];

const data: Ticket[] = [
  { id: '1', title: 'Impressora não liga', priority: 'Alta' },
  { id: '2', title: 'Erro ao salvar chamado', priority: 'Baixa' },
];

const getId = (item: Ticket) => item.id;
const createEmptyItem = (): Ticket => ({ id: '', title: '', priority: '' });

describe('EzSimpleCrud', () => {
  it('renders the grid by default with the IN_MEMORY data', () => {
    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="IN_MEMORY"
        data={data}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
    expect(screen.getByText('Erro ao salvar chamado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeInTheDocument();
  });

  it('clicking INSERT shows an empty form', async () => {
    const user = userEvent.setup();
    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="IN_MEMORY"
        data={data}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Incluir' }));

    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Incluir' })).not.toBeInTheDocument();
  });

  it('clicking a grid row shows the form filled with that item', async () => {
    const user = userEvent.setup();
    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="IN_MEMORY"
        data={data}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // index 0 is the "select all" header checkbox; row checkboxes start at 1
    await user.click(checkboxes[1]);

    expect(screen.getByLabelText('Título')).toHaveValue('Impressora não liga');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('Alta');
  });

  it('SAVE in IN_MEMORY mode updates the dataset and returns to the grid', async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [items, setItems] = useState<Ticket[]>(data);
      return (
        <EzSimpleCrud
          columns={columns}
          fields={fields}
          mode="IN_MEMORY"
          data={items}
          onDataChange={setItems}
          getId={getId}
          createEmptyItem={createEmptyItem}
        />
      );
    }

    render(<Wrapper />);

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    await user.type(screen.getByLabelText('Título'), 'Novo chamado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Novo chamado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('CANCEL returns to the grid without changing the dataset', async () => {
    const user = userEvent.setup();
    const onDataChange = vi.fn();
    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="IN_MEMORY"
        data={data}
        onDataChange={onDataChange}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    await user.type(screen.getByLabelText('Título'), 'Alteração descartada');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onDataChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeInTheDocument();
    expect(screen.queryByText('Alteração descartada')).not.toBeInTheDocument();
  });

  it('SERVER mode calls onFetch on mount and shows a loading state', async () => {
    let resolveFetch: (value: Ticket[]) => void = () => undefined;
    const onFetch = vi.fn(
      () =>
        new Promise<Ticket[]>((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="SERVER"
        onFetch={onFetch}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Impressora não liga')).not.toBeInTheDocument();

    resolveFetch(data);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByText('Impressora não liga')).toBeInTheDocument();
  });

  it('SERVER mode SAVE calls onSave and adds the returned item to the grid', async () => {
    const user = userEvent.setup();
    const onFetch = vi.fn().mockResolvedValue(data);
    const savedItem: Ticket = { id: '3', title: 'Novo chamado via servidor', priority: 'Média' };
    const onSave = vi.fn().mockResolvedValue(savedItem);

    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="SERVER"
        onFetch={onFetch}
        onSave={onSave}
        getId={getId}
        createEmptyItem={createEmptyItem}
      />
    );

    await waitFor(() => expect(screen.getByText('Impressora não liga')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Incluir' }));
    await user.type(screen.getByLabelText('Título'), 'Novo chamado via servidor');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Novo chamado via servidor')).toBeInTheDocument());
  });

  it('renders a CONFIGURATOR button that calls onOpenConfigurator when provided', async () => {
    const user = userEvent.setup();
    const onOpenConfigurator = vi.fn();
    render(
      <EzSimpleCrud
        columns={columns}
        fields={fields}
        mode="IN_MEMORY"
        data={data}
        getId={getId}
        createEmptyItem={createEmptyItem}
        onOpenConfigurator={onOpenConfigurator}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Configurador' }));
    expect(onOpenConfigurator).toHaveBeenCalledTimes(1);
  });
});
