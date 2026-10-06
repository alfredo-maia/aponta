import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzSimpleFormConfig } from './EzSimpleFormConfig';

const availableFields = [
  { name: 'razaoSocial', label: 'Razão Social' },
  { name: 'cnpj', label: 'CNPJ' },
  { name: 'email', label: 'E-mail' },
];

const baseValue = [
  { name: 'razaoSocial', tab: 'Geral', visible: true },
  { name: 'cnpj', tab: 'Geral', visible: false },
  { name: 'email', tab: 'Contato', visible: true },
];

describe('EzSimpleFormConfig', () => {
  it('renders the list of available fields with the correct visible state', () => {
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={() => undefined}
      />
    );

    expect(screen.getByText('Razão Social')).toBeInTheDocument();
    expect(screen.getByText('CNPJ')).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toBeInTheDocument();

    const razaoSocialCheck = screen.getByRole('checkbox', { name: /razão social/i });
    const cnpjCheck = screen.getByRole('checkbox', { name: /cnpj/i });
    const emailCheck = screen.getByRole('checkbox', { name: /e-mail/i });

    expect(razaoSocialCheck).toBeChecked();
    expect(cnpjCheck).not.toBeChecked();
    expect(emailCheck).toBeChecked();
  });

  it('calls onChange with the updated config when toggling field visibility', async () => {
    const onChange = vi.fn();
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={onChange}
      />
    );

    const cnpjCheck = screen.getByRole('checkbox', { name: /cnpj/i });
    await userEvent.click(cnpjCheck);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { name: 'razaoSocial', tab: 'Geral', visible: true },
      { name: 'cnpj', tab: 'Geral', visible: true },
      { name: 'email', tab: 'Contato', visible: true },
    ]);
  });

  it('calls onChange with the updated tab when changing a field tab', async () => {
    const onChange = vi.fn();
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={onChange}
      />
    );

    const razaoSocialTabSelect = screen.getByLabelText(/aba.*razão social/i);
    await userEvent.selectOptions(razaoSocialTabSelect, 'Contato');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { name: 'razaoSocial', tab: 'Contato', visible: true },
      { name: 'cnpj', tab: 'Geral', visible: false },
      { name: 'email', tab: 'Contato', visible: true },
    ]);
  });

  it('calls onSave when clicking the save button', async () => {
    const onSave = vi.fn();
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={() => undefined}
        onSave={onSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking the cancel button', async () => {
    const onCancel = vi.fn();
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={() => undefined}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('defaults to a single "Geral" tab when tabs is not provided or empty', () => {
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        onChange={() => undefined}
      />
    );

    const razaoSocialTabSelect = screen.getByLabelText(/aba.*razão social/i);
    expect(razaoSocialTabSelect).toHaveTextContent('Geral');
  });

  it('allows creating and assigning a new tab to a field', async () => {
    const onChange = vi.fn();
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={onChange}
      />
    );

    await userEvent.type(screen.getByLabelText(/nova aba/i), 'Financeiro');
    await userEvent.click(screen.getByRole('button', { name: /adicionar aba/i }));

    const cnpjTabSelect = screen.getByLabelText(/aba.*cnpj/i);
    await userEvent.selectOptions(cnpjTabSelect, 'Financeiro');

    expect(onChange).toHaveBeenLastCalledWith([
      { name: 'razaoSocial', tab: 'Geral', visible: true },
      { name: 'cnpj', tab: 'Financeiro', visible: false },
      { name: 'email', tab: 'Contato', visible: true },
    ]);
  });

  it('does not render Save/Cancel buttons when the callbacks are not provided', () => {
    render(
      <EzSimpleFormConfig
        availableFields={availableFields}
        value={baseValue}
        tabs={['Geral', 'Contato']}
        onChange={() => undefined}
      />
    );
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });
});
