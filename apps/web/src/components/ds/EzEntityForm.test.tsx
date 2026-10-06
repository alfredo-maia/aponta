import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzEntityForm, type EzEntityFormField } from './EzEntityForm';

const ALL_FIELDS: EzEntityFormField[] = [
  { name: 'nome', label: 'Nome', type: 'text' },
  { name: 'idade', label: 'Idade', type: 'number' },
  { name: 'nascimento', label: 'Nascimento', type: 'date' },
  { name: 'criadoEm', label: 'Criado em', type: 'datetime' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Ativo', value: 'ATIVO' },
      { label: 'Inativo', value: 'INATIVO' },
    ],
  },
  { name: 'obs', label: 'Observações', type: 'textarea' },
  { name: 'ativo', label: 'Ativo', type: 'checkbox' },
  {
    name: 'genero',
    label: 'Gênero',
    type: 'radio',
    options: [
      { label: 'Masculino', value: 'M' },
      { label: 'Feminino', value: 'F' },
    ],
  },
];

const ALL_VALUES: Record<string, unknown> = {
  nome: '',
  idade: 0,
  nascimento: '',
  criadoEm: '',
  status: '',
  obs: '',
  ativo: false,
  genero: '',
};

describe('EzEntityForm', () => {
  it('renders a field for each type declared in the schema', () => {
    render(<EzEntityForm fields={ALL_FIELDS} values={ALL_VALUES} onChange={() => undefined} />);

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Idade')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByLabelText('Nascimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Criado em')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByText('Ativo', { selector: 'option' })).toBeInTheDocument();
    expect(screen.getByLabelText('Observações')).toBeInTheDocument();
    expect(screen.getByText('Ativo', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Gênero')).toBeInTheDocument();
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Feminino')).toBeInTheDocument();
  });

  it('calls onChange with the field name and typed value for a text input', async () => {
    const onChange = vi.fn();
    render(
      <EzEntityForm
        fields={[{ name: 'nome', label: 'Nome', type: 'text' }]}
        values={{ nome: '' }}
        onChange={onChange}
      />
    );

    await userEvent.type(screen.getByLabelText('Nome'), 'x');
    expect(onChange).toHaveBeenCalledWith('nome', 'x');
  });

  it('calls onChange with a boolean for a checkbox field', async () => {
    const onChange = vi.fn();
    render(
      <EzEntityForm
        fields={[{ name: 'ativo', label: 'Ativo', type: 'checkbox' }]}
        values={{ ativo: false }}
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('ativo', true);
  });

  it('calls onChange with the option value for a select field', async () => {
    const onChange = vi.fn();
    render(
      <EzEntityForm
        fields={[
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Ativo', value: 'ATIVO' },
              { label: 'Inativo', value: 'INATIVO' },
            ],
          },
        ]}
        values={{ status: 'ATIVO' }}
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'INATIVO');
    expect(onChange).toHaveBeenCalledWith('status', 'INATIVO');
  });

  it('calls onChange with the option value for a radio field', async () => {
    const onChange = vi.fn();
    render(
      <EzEntityForm
        fields={[
          {
            name: 'genero',
            label: 'Gênero',
            type: 'radio',
            options: [
              { label: 'Masculino', value: 'M' },
              { label: 'Feminino', value: 'F' },
            ],
          },
        ]}
        values={{ genero: '' }}
        onChange={onChange}
      />
    );

    await userEvent.click(screen.getByLabelText('Feminino'));
    expect(onChange).toHaveBeenCalledWith('genero', 'F');
  });

  it('displays the error message when errors[name] is present', () => {
    render(
      <EzEntityForm
        fields={[{ name: 'nome', label: 'Nome', type: 'text' }]}
        values={{ nome: '' }}
        onChange={() => undefined}
        errors={{ nome: 'Campo obrigatório' }}
      />
    );

    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('displays the error message for field types without native error support (number)', () => {
    render(
      <EzEntityForm
        fields={[{ name: 'idade', label: 'Idade', type: 'number' }]}
        values={{ idade: 0 }}
        onChange={() => undefined}
        errors={{ idade: 'Valor inválido' }}
      />
    );

    expect(screen.getByText('Valor inválido')).toBeInTheDocument();
  });

  it('shows a required visual indicator ("*") next to the label', () => {
    render(
      <EzEntityForm
        fields={[{ name: 'nome', label: 'Nome', type: 'text', required: true }]}
        values={{ nome: '' }}
        onChange={() => undefined}
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies a 1-column grid by default (CASCADE layout)', () => {
    const { container } = render(
      <EzEntityForm
        fields={[{ name: 'nome', label: 'Nome', type: 'text' }]}
        values={{ nome: '' }}
        onChange={() => undefined}
      />
    );

    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('applies a 2-column grid and respects colSpan when layout is SIDE_BY_SIDE', () => {
    const { container } = render(
      <EzEntityForm
        layout="SIDE_BY_SIDE"
        fields={[
          { name: 'nome', label: 'Nome', type: 'text', colSpan: 2 },
          { name: 'idade', label: 'Idade', type: 'number' },
        ]}
        values={{ nome: '', idade: 0 }}
        onChange={() => undefined}
      />
    );

    expect(container.firstChild).toHaveClass('grid-cols-2');
    const nomeWrapper = screen.getByLabelText('Nome').closest('[data-field-name="nome"]');
    expect(nomeWrapper).toHaveClass('col-span-2');
  });
});
