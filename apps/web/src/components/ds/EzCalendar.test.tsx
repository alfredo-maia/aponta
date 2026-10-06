import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzCalendar } from './EzCalendar';

describe('EzCalendar', () => {
  it('renders the reference month and year', () => {
    render(<EzCalendar value={new Date(2024, 2, 15)} />);
    expect(screen.getByText('Março 2024')).toBeInTheDocument();
  });

  it('navigates to the next month when the chevron-right button is clicked', async () => {
    const user = userEvent.setup();
    render(<EzCalendar value={new Date(2024, 2, 15)} />);

    await user.click(screen.getByLabelText('Próximo mês'));
    expect(screen.getByText('Abril 2024')).toBeInTheDocument();
  });

  it('navigates to the previous month when the chevron-left button is clicked', async () => {
    const user = userEvent.setup();
    render(<EzCalendar value={new Date(2024, 2, 15)} />);

    await user.click(screen.getByLabelText('Mês anterior'));
    expect(screen.getByText('Fevereiro 2024')).toBeInTheDocument();
  });

  it('calls onSelectDate and applies the selected class on the chosen day', async () => {
    const onSelectDate = vi.fn();
    const user = userEvent.setup();
    render(<EzCalendar value={new Date(2024, 2, 15)} onSelectDate={onSelectDate} />);

    const dayButton = screen.getByText('20');
    await user.click(dayButton);

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    const selectedDate = onSelectDate.mock.calls[0][0] as Date;
    expect(selectedDate.getDate()).toBe(20);
  });
});
