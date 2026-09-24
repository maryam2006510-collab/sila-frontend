// src/lib/api/config.ts
// API_CONTRACT.md §1: the base URL is the server root; every path starts with /api.

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8010').replace(/\/+$/, '');

// Mock mode is opt-in only. When off, every request hits the backend and
// network failures surface as errors (never a silent fallback to demo data).
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
