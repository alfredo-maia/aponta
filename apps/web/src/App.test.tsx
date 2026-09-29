import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('should render the Aponta heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /aponta/i }),
    ).toBeInTheDocument();
  });
});
