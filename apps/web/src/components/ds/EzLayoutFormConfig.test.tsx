import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzLayoutFormConfig } from './EzLayoutFormConfig';

describe('EzLayoutFormConfig', () => {
  it('renders with the correct option selected according to defaultLayout', () => {
    render(<EzLayoutFormConfig defaultLayout="SIDE_BY_SIDE" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: /lado a lado/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: /cascata/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('defaults to CASCADE when defaultLayout is not provided', () => {
    render(<EzLayoutFormConfig onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: /cascata/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('calls onChange with the correct value when clicking the other option', () => {
    const onChange = vi.fn();
    render(<EzLayoutFormConfig defaultLayout="CASCADE" onChange={onChange} />);
    screen.getByRole('radio', { name: /lado a lado/i }).click();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('SIDE_BY_SIDE');
  });

  it('calls onChange with CASCADE when clicking it while SIDE_BY_SIDE is selected', () => {
    const onChange = vi.fn();
    render(<EzLayoutFormConfig defaultLayout="SIDE_BY_SIDE" onChange={onChange} />);
    screen.getByRole('radio', { name: /cascata/i }).click();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('CASCADE');
  });

  it('keeps both layout options always visible regardless of selection', () => {
    render(<EzLayoutFormConfig defaultLayout="SIDE_BY_SIDE" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: /cascata/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /lado a lado/i })).toBeInTheDocument();
  });

  it('updates the selected option visually after clicking (controlled internal state)', () => {
    const onChange = vi.fn();
    render(<EzLayoutFormConfig defaultLayout="CASCADE" onChange={onChange} />);
    const sideBySideOption = screen.getByRole('radio', { name: /lado a lado/i });
    fireEvent.click(sideBySideOption);
    expect(sideBySideOption).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /cascata/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });
});
