import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzSegmented } from './EzSegmented';

const options = [
  { value: 'list', label: 'Lista' },
  { value: 'kanban', label: 'Kanban' },
] as const;

function renderSegmented(props: Partial<Parameters<typeof EzSegmented>[0]> = {}) {
  return render(
    <EzSegmented
      aria-label="Visualização"
      options={[...options]}
      value="kanban"
      onChange={vi.fn()}
      {...props}
    />,
  );
}

describe('EzSegmented (AC-03, AC-15)', () => {
  it('renders the options as buttons inside a named group', () => {
    renderSegmented();
    const group = screen.getByRole('group', { name: 'Visualização' });
    expect(group).toContainElement(screen.getByRole('button', { name: 'Lista' }));
    expect(group).toContainElement(screen.getByRole('button', { name: 'Kanban' }));
  });

  it('exposes the selected option with aria-pressed', () => {
    renderSegmented({ value: 'kanban' });
    expect(screen.getByRole('button', { name: 'Kanban' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the option value on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSegmented({ onChange });
    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('does not call onChange for a disabled option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSegmented({
      onChange,
      options: [
        { value: 'list', label: 'Lista', disabled: true },
        { value: 'kanban', label: 'Kanban' },
      ],
    });
    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is reachable by keyboard and activates with Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSegmented({ onChange, value: 'kanban' });
    await user.tab();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('list');
  });
});
