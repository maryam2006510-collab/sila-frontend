// AI Advisor (D37): the answer with its source line, the disclaimer under every answer, the
// budget rules (words → confirm before any offer, none → quick choices) and the error states.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdvisorPage } from './AdvisorPage';
import { ApiError } from '@/lib/api';
import type { AdvisorAnswer, AssetListing, MatchResult } from '@/lib/types';

// askAdvisor only records the calls; the replies come from a plain queue. (A vi.fn that returns a
// rejected promise keeps it in mock.results, and Vitest then fails the test with that error even
// though the page handled it.)
const askAdvisor = vi.fn();
let replies: (() => Promise<AdvisorAnswer>)[] = [];
let fallbackReply: () => Promise<AdvisorAnswer> = () => Promise.reject(new Error('no reply set'));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      askAdvisor: (...args: unknown[]) => {
        askAdvisor(...args);
        return (replies.shift() ?? fallbackReply)();
      },
    },
  };
});
const reply = (a: AdvisorAnswer) => (fallbackReply = () => Promise.resolve(a));
const replyOnce = (a: AdvisorAnswer) => replies.push(() => Promise.resolve(a));
const rejectWith = (error: Error) => (fallbackReply = () => Promise.reject(error));

const DISCLAIMER = 'هذي المعلومات استرشادية وليست نصيحة مالية. قرار الشراء يرجعلك.';

const listing: AssetListing = {
  id: '00000000-0000-4000-8200-000000000001',
  seller_id: 's1',
  seller_name: 'مجوهرات الكرّادة',
  seller_verified: true,
  karat: 21,
  total_weight_grams: 84.25,
  available_weight_grams: 74.25,
  base_price_per_gram: 157_000,
  current_price_per_gram: 157_193,
  status: 'active',
  is_promoted: false,
  promotion_expiry_date: null,
  created_at: '2026-09-12T08:00:00Z',
  updated_at: '2026-09-24T08:00:00Z',
};

const suggestion: MatchResult = {
  rank: 1,
  listing,
  suggested_weight_grams: 12.535,
  execution_price_per_gram: 157_193,
  estimated_total_iqd: 1_999_972,
  commission_rate: 0.015,
  budget_usage_pct: 1,
  score: 0.95,
  reason: 'عيار 21 الأكثر تداولاً',
};

const answer = (patch: Partial<AdvisorAnswer> = {}): AdvisorAnswer => ({
  engine: 'rules',
  answer: 'سعر غرام الذهب عيار 24 هسة 179,649 دينار.',
  budget: null,
  suggestions: [],
  market: { price_24k_per_gram: 179_649, change_24h_pct: 0.0084, updated_at: '2026-10-08T08:00:00Z', is_stale: false },
  disclaimer: DISCLAIMER,
  ...patch,
});

const ask = (question: string) => {
  fireEvent.change(screen.getByLabelText('سؤالك'), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: 'اسأل المستشار' }));
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdvisorPage />
    </MemoryRouter>
  );

beforeEach(() => {
  askAdvisor.mockReset();
  replies = [];
});

describe('AdvisorPage', () => {
  it('shows the answer, the simplified-answer note, the offers and the disclaimer', async () => {
    reply(
      answer({
        budget: { amount_iqd: 2_000_000, source: 'request', confirmed: true },
        suggestions: [suggestion],
      })
    );
    renderPage();
    ask('شنو أحسن شي أشتريه؟');

    expect(await screen.findByText(/سعر غرام الذهب عيار/)).toBeInTheDocument();
    expect(screen.getByText('رد مبسط بناءً على أسعار اليوم وميزانيتك')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اشترِ هذا العرض' })).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'تصفح السوق بنفسك' })).toHaveAttribute('href', '/app/market');
    expect(askAdvisor).toHaveBeenCalledWith('شنو أحسن شي أشتريه؟', undefined);
  });

  it('labels a model-worded answer', async () => {
    reply(answer({ engine: 'llm' }));
    renderPage();
    ask('هل هسة وقت مناسب؟');
    expect(await screen.findByText('رد بصياغة نموذج لغوي، والأرقام والعروض من المنصة')).toBeInTheDocument();
  });

  it('asks to confirm a budget read from words and shows no offer before it', async () => {
    replyOnce(answer({ budget: { amount_iqd: 2_000_000, source: 'question_words', confirmed: false } }));
    replyOnce(
      answer({
        budget: { amount_iqd: 2_000_000, source: 'request', confirmed: true },
        suggestions: [suggestion],
      })
    );
    renderPage();
    ask('عندي مليونين');

    expect(await screen.findByText('فهمت ميزانيتك 2,000,000 د.ع، صح؟')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'اشترِ هذا العرض' })).not.toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'نعم، اعرض العروض' }));
    expect(await screen.findByRole('button', { name: 'اشترِ هذا العرض' })).toBeInTheDocument();
    // The same question again, now with the confirmed amount
    expect(askAdvisor).toHaveBeenLastCalledWith('عندي مليونين', 2_000_000);
  });

  it('offers quick budget choices when no budget was given', async () => {
    reply(answer());
    renderPage();
    ask('هل هسة وقت مناسب للشراء؟');

    expect(await screen.findByText('اختار ميزانيتك حتى أقترح عليك عروض:')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^1 مليون/ }));
    expect(askAdvisor).toHaveBeenLastCalledWith('هل هسة وقت مناسب للشراء؟', 1_000_000);
  });

  it('shows the wait time and locks sending when rate limited', async () => {
    rejectWith(new ApiError(429, 'RATE_LIMITED', 'محاولات كثيرة', [], 30));
    renderPage();
    ask('شنو أشتري؟');

    expect(await screen.findByRole('alert')).toHaveTextContent('حاول بعد 30 ثانية');
    fireEvent.change(screen.getByLabelText('سؤالك'), { target: { value: 'سؤال ثاني' } });
    expect(screen.getByRole('button', { name: 'اسأل المستشار' })).toBeDisabled();
  });

  it('shows the unavailable state with the manual path', async () => {
    rejectWith(new ApiError(503, 'AI_UNAVAILABLE', 'غير متاح'));
    renderPage();
    ask('شنو أشتري؟');
    expect(await screen.findByRole('alert')).toHaveTextContent('المستشار الذكي غير متاح مؤقتاً.');
    expect(screen.getByRole('link', { name: 'تصفح السوق بنفسك' })).toBeInTheDocument();
  });
});
