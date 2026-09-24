// MoneyInput: LTR digits with live grouping; external value changes (chips, clamping) are adopted
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyInput } from './MoneyInput';

const Harness = ({ initial = 0 }: { initial?: number }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MoneyInput label="المبلغ" value={value} onChangeValue={setValue} suggestions={[500_000]} />
      <output data-testid="value">{value}</output>
    </>
  );
};

describe('MoneyInput', () => {
  it('groups thousands while typing and reports the number', () => {
    render(<Harness />);
    const input = screen.getByLabelText('المبلغ');
    fireEvent.change(input, { target: { value: '1250000' } });
    expect(input).toHaveValue('1,250,000');
    expect(screen.getByTestId('value')).toHaveTextContent('1250000');
  });

  it('keeps an in-progress decimal such as "12." intact', () => {
    render(<Harness />);
    const input = screen.getByLabelText('المبلغ');
    fireEvent.change(input, { target: { value: '12.' } });
    expect(input).toHaveValue('12.');
  });

  it('adopts a value set from outside (suggestion chip)', () => {
    render(<Harness initial={10} />);
    fireEvent.click(screen.getByRole('button', { name: /500,000/ }));
    expect(screen.getByLabelText('المبلغ')).toHaveValue('500,000');
  });

  it('is always LTR for digits', () => {
    render(<Harness />);
    expect(screen.getByLabelText('المبلغ')).toHaveAttribute('dir', 'ltr');
  });
});
