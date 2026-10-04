import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Activity } from 'lucide-react';
import { EzTile } from './EzTile';

describe('EzTile', () => {
  it('renders just label when value/description are omitted', () => {
    render(<EzTile label="Just Label" />);
    expect(screen.getByText('Just Label')).toBeInTheDocument();
  });

  it('renders label, value, and description', () => {
    render(<EzTile label="Total Sales" value={150} description="+15% from last month" />);
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('+15% from last month')).toBeInTheDocument();
  });

  it('renders icon with default brand variant', () => {
    const { container } = render(
      <EzTile label="Brand" icon={<Activity data-testid="icon" />} />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    // Default brand variant wrapper
    expect(container.querySelector('.bg-brand-100')).toBeInTheDocument();
  });

  it('renders icon with specific variant (e.g. green)', () => {
    const { container } = render(
      <EzTile label="Green" icon={<Activity />} iconVariant="green" />
    );
    // Green variant wrapper
    expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
  });
});
