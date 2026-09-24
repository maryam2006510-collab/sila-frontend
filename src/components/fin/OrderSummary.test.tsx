// Money-safety UX (08-ux §1.2, §8 Step 5.2): fees visible before confirm, confirm repeats the
// total, a live countdown to quote_expires_at, and an expired quote replaces confirm with
// "refresh preview" (API_CONTRACT.md §5).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderSummary } from './OrderSummary';
import { TransactionPreview } from '@/lib/types';

const now = Date.now();
const preview: TransactionPreview = {
  asset_id: '00000000-0000-4000-8200-000000000001',
  purchased_weight_grams: 12.5,
  karat: 21,
  execution_price_per_gram: 98_450,
  principal_amount: 1_230_625,
  commission_rate: 0.015,
  commission_amount: 18_459,
  total_paid_by_investor: 1_249_084,
  price_updated_at: new Date(now).toISOString(),
  quoted_at: new Date(now).toISOString(),
  quote_expires_at: new Date(now + 60_000).toISOString(),
  quote_token: 'token',
  risk_insight: null,
  risk_insight_note: null,
};

describe('OrderSummary', () => {
  it('shows the commission rate and amount before the confirm action', () => {
    render(<OrderSummary preview={preview} onConfirm={() => {}} />);
    expect(screen.getByText('1.5%')).toBeInTheDocument();
    expect(screen.getByText('18,459')).toBeInTheDocument();
  });

  it('repeats the total inside the confirm button', () => {
    const onConfirm = vi.fn();
    render(<OrderSummary preview={preview} onConfirm={onConfirm} />);
    const confirm = screen.getByRole('button', { name: /أكّد الشراء/ });
    expect(confirm).toHaveTextContent('1,249,084');
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('counts down to the quote expiry', () => {
    render(<OrderSummary preview={preview} onConfirm={() => {}} />);
    expect(screen.getByText(/السعر مثبّت، ينتهي خلال/)).toBeInTheDocument();
  });

  it('replaces confirm with refresh when the quote has expired', () => {
    const onRefresh = vi.fn();
    render(<OrderSummary preview={preview} onConfirm={() => {}} onRefresh={onRefresh} isStale />);
    expect(screen.queryByRole('button', { name: /أكّد الشراء/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'حدّث المعاينة' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
