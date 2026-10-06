import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzChart } from './EzChart';

describe('EzChart', () => {
  const data = [
    { label: 'Jan', value: 10 },
    { label: 'Fev', value: 20 },
    { label: 'Mar', value: 5 },
  ];

  it('renders a label and value for each data point', () => {
    render(<EzChart data={data} />);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Fev')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('sizes the tallest bar at 100% height in the vertical (bar) variant', () => {
    render(<EzChart data={data} variant="bar" />);
    const tallestBar = screen.getByTestId('ez-chart-bar-Fev');
    expect(tallestBar).toHaveStyle({ height: '100%' });
  });

  it('sizes the widest bar at 100% width in the horizontal-bar variant', () => {
    render(<EzChart data={data} variant="horizontal-bar" />);
    const widestBar = screen.getByTestId('ez-chart-bar-Fev');
    expect(widestBar).toHaveStyle({ width: '100%' });
  });

  it('applies the brand color class to bars by default', () => {
    render(<EzChart data={data} variant="horizontal-bar" />);
    const bar = screen.getByTestId('ez-chart-bar-Jan');
    expect(bar).toHaveClass('bg-brand-600');
  });
});
