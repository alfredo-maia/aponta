import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzFormView } from './EzFormView';

const fields = [
  { label: 'Nome', value: 'João Silva' },
  { label: 'Status', value: 'Aberto' },
];

describe('EzFormView', () => {
  it('renders all labels and values', () => {
    render(<EzFormView fields={fields} />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders a field entry per item passed', () => {
    const { container } = render(<EzFormView fields={fields} />);
    expect(container.firstElementChild?.children.length).toBe(2);
  });

  it('applies responsive grid classes', () => {
    const { container } = render(<EzFormView fields={fields} />);
    expect(container.firstChild).toHaveClass('sm:grid-cols-2');
  });
});
