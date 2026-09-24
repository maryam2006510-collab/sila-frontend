// src/lib/api/errors.ts
// Unified error shape (API_CONTRACT.md §2): { error_code, message, status, details? }.
// Branch on the code; show the server's Arabic `message` to the user.

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
export const errorMessage = (err: unknown, fallback: string): string =>
  isApiError(err) && err.message ? err.message : fallback;

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
