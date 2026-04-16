/**
 * API Client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const api = {
  baseUrl: API_URL,
};

