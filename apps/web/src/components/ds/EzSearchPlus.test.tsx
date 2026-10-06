import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzSearchPlus } from './EzSearchPlus';

describe('EzSearchPlus', () => {
  it('renders the current value and placeholder', () => {
    render(
      <EzSearchPlus value="ticket" onChange={() => undefined} onToggleFilters={() => undefined} />
    );
    expect(screen.getByDisplayValue('ticket')).toBeInTheDocument();
    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('calls onChange when the user types', async () => {
    const handleChange = vi.fn();
    render(
      <EzSearchPlus value="" onChange={handleChange} onToggleFilters={() => undefined} />
    );
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'abc');
    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onToggleFilters when the Filtros button is clicked', async () => {
    const handleToggle = vi.fn();
    render(
      <EzSearchPlus value="" onChange={() => undefined} onToggleFilters={handleToggle} />
    );
    await userEvent.click(screen.getByText('Filtros'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('applies brand highlight classes and shows the filters panel when filtersActive', () => {
    render(
      <EzSearchPlus
        value=""
        onChange={() => undefined}
        onToggleFilters={() => undefined}
        filtersActive
        filtersPanel={<div data-testid="panel">Painel</div>}
      />
    );
    expect(screen.getByText('Filtros')).toHaveClass('bg-brand-50');
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});
