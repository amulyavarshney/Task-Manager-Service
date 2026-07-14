import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiKey, setApiKey } from './api';

describe('api key storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('stores and reads API key from localStorage', () => {
    setApiKey('test-key-123');
    expect(getApiKey()).toBe('test-key-123');
  });

  it('clears API key when empty string is saved', () => {
    setApiKey('temp');
    setApiKey('');
    expect(getApiKey()).toBe('');
  });
});
