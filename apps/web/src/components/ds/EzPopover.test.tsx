import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzPopover } from './EzPopover';

describe('EzPopover', () => {
  it('renders the trigger content', () => {
    render(<EzPopover trigger={<button>Click Me</button>} content={<div>Popup Content</div>} />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('does not render content initially', () => {
    render(<EzPopover trigger={<button>Click Me</button>} content={<div>Popup Content</div>} />);
    expect(screen.queryByText('Popup Content')).not.toBeInTheDocument();
  });

  it('shows content when trigger is clicked', async () => {
    render(<EzPopover trigger={<button>Click Me</button>} content={<div>Popup Content</div>} />);
    await userEvent.click(screen.getByText('Click Me'));
    expect(screen.getByText('Popup Content')).toBeInTheDocument();
  });

  it('hides content when clicking outside', async () => {
    render(
      <div data-testid="outside">
        <EzPopover trigger={<button>Click Me</button>} content={<div>Popup Content</div>} />
      </div>
    );
    await userEvent.click(screen.getByText('Click Me'));
    expect(screen.getByText('Popup Content')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByText('Popup Content')).not.toBeInTheDocument();
  });

  it('applies left alignment class when align="left"', async () => {
    render(<EzPopover trigger={<button>Click Me</button>} content={<div>Popup Content</div>} align="left" />);
    await userEvent.click(screen.getByText('Click Me'));
    const popupContent = screen.getByText('Popup Content');
    expect(popupContent.parentElement).toHaveClass('left-0', 'origin-top-left');
  });
});
