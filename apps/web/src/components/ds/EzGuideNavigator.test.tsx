import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzGuideNavigator } from './EzGuideNavigator';

const steps = [
  { id: 1, label: 'Dados' },
  { id: 2, label: 'Endereço' },
  { id: 3, label: 'Revisão' },
];

describe('EzGuideNavigator', () => {
  it('renders all step labels', () => {
    render(<EzGuideNavigator steps={steps} currentStep={0} />);
    expect(screen.getByText('Dados')).toBeInTheDocument();
    expect(screen.getByText('Endereço')).toBeInTheDocument();
    expect(screen.getByText('Revisão')).toBeInTheDocument();
  });

  it('calls onStepClick with the clicked index', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<EzGuideNavigator steps={steps} currentStep={0} onStepClick={onStepClick} />);

    await user.click(screen.getByText('2'));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it('highlights the current step with brand-600 and marks completed steps with a check', () => {
    const { container } = render(<EzGuideNavigator steps={steps} currentStep={1} />);
    const buttons = container.querySelectorAll('button');
    // Step 0 is completed -> brand-600 + check icon, no "1" text
    expect(buttons[0]).toHaveClass('bg-brand-600');
    expect(buttons[0].querySelector('svg')).toBeInTheDocument();
    // Step 1 (index 1) is current -> brand-600 as well
    expect(buttons[1]).toHaveClass('bg-brand-600');
    // Step 2 is upcoming -> not highlighted
    expect(buttons[2]).toHaveClass('bg-white');
  });
});
