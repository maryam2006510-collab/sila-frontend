// src/lib/api/errors.ts
// Unified error shape (API_CONTRACT.md §2): { error_code, message, status, details? }.
// Branch on the code; show the server's Arabic `message` to the user (errorMessage).

import { useLocaleStore } from '@/lib/direction';
import { messagesNow } from '@/i18n';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'KYC_NOT_VERIFIED'
  | 'SUBSCRIPTION_REQUIRED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'EMAIL_ALREADY_EXISTS'
  | 'LISTING_NOT_ACTIVE'
  | 'INSUFFICIENT_AVAILABLE_WEIGHT'
  | 'PRICE_CHANGED'
  | 'INVALID_STATUS_TRANSITION'
  | 'PAYMENT_FAILED'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'PRICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'ACCOUNT_DISABLED'
  | 'INSUFFICIENT_HOLDINGS'
  // Client-side only: the request never reached the server
  | 'NETWORK_ERROR';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | string;
  // VALIDATION_ERROR: one entry per invalid field
  readonly details: FieldError[];
  // RATE_LIMITED: seconds from the Retry-After header
  readonly retryAfter: number | null;

  constructor(
    status: number,
    code: ApiErrorCode | string,
    message: string,
    details: FieldError[] = [],
    retryAfter: number | null = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

export const hasErrorCode = (err: unknown, code: ApiErrorCode): boolean => isApiError(err) && err.code === code;

// The server's Arabic message when there is one, else the caller's fallback
// Arabic shows the server's message. Other languages show their text for the code (D45):
// the specific reason when there is one, the caller's fallback for generic failures.
const GENERIC_CODES = new Set(['VALIDATION_ERROR', 'INTERNAL_ERROR']);

export const errorMessage = (err: unknown, fallback: string): string => {
  if (!isApiError(err)) return fallback;
  if (useLocaleStore.getState().locale === 'ar') return err.message || fallback;
  if (GENERIC_CODES.has(err.code)) return fallback;
  return messagesNow().errors[err.code] ?? fallback;
};

// Text written by the server (Arabic only): shown as is in Arabic, replaced elsewhere
export const serverText = (text: string | null | undefined, local: string): string =>
  useLocaleStore.getState().locale === 'ar' && text ? text : local;

// The message for one form field, from VALIDATION_ERROR details
export const fieldError = (err: unknown, field: string): string | undefined =>
  isApiError(err) ? err.details.find((d) => d.field === field)?.message : undefined;

// Only for bodies without an error_code (should not happen with this backend)
const codeFromStatus = (status: number): ApiErrorCode => {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 405:
      return 'METHOD_NOT_ALLOWED';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
};

export const toApiError = (status: number, body: unknown, retryAfter: number | null = null): ApiError => {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.error_code === 'string') {
      const details = Array.isArray(b.details)
        ? (b.details as FieldError[]).filter((d) => d && typeof d.field === 'string')
        : [];
      return new ApiError(status, b.error_code, typeof b.message === 'string' ? b.message : '', details, retryAfter);
    }
  }
  return new ApiError(status, codeFromStatus(status), '', [], retryAfter);
};
