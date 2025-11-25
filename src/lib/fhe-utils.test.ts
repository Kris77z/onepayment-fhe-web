/**
 * Unit tests for FHE utilities
 * 
 * Note: These tests require mocking fetch API
 */

import {
  encryptAmount,
  decryptAmount,
  checkFHEHealth,
  formatAmount,
  validateAmount,
  FHEError,
} from './fhe-utils';

// Mock fetch globally
global.fetch = jest.fn();

describe('FHE Utils', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('encryptAmount', () => {
    it('should encrypt a valid amount', async () => {
      const mockResponse = {
        ciphertext: 'ZW5jcnlwdGVkXzEwMC41',
        public_key: null,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await encryptAmount(100.5);
      expect(result).toBe(mockResponse.ciphertext);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/fhe/encrypt'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 100.5 }),
        })
      );
    });

    it('should throw error for negative amount', async () => {
      await expect(encryptAmount(-10)).rejects.toThrow(FHEError);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw error for amount exceeding limit', async () => {
      await expect(encryptAmount(1000000)).rejects.toThrow(FHEError);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw error for invalid decimal places', async () => {
      await expect(encryptAmount(100.123)).rejects.toThrow(FHEError);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Encryption failed' }),
      });

      await expect(encryptAmount(100)).rejects.toThrow(FHEError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network error'));

      await expect(encryptAmount(100)).rejects.toThrow(FHEError);
    });
  });

  describe('decryptAmount', () => {
    it('should decrypt a valid ciphertext', async () => {
      const mockResponse = {
        amount: 100.5,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await decryptAmount('ZW5jcnlwdGVkXzEwMC41');
      expect(result).toBe(mockResponse.amount);
    });

    it('should throw error for empty ciphertext', async () => {
      await expect(decryptAmount('')).rejects.toThrow(FHEError);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid ciphertext' }),
      });

      await expect(decryptAmount('invalid')).rejects.toThrow(FHEError);
    });
  });

  describe('checkFHEHealth', () => {
    it('should return true when service is healthy', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', service: 'fhe-service' }),
      });

      const result = await checkFHEHealth();
      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkFHEHealth();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkFHEHealth();
      expect(result).toBe(false);
    });
  });

  describe('formatAmount', () => {
    it('should format amount as currency', () => {
      expect(formatAmount(100.5)).toMatch(/\$100\.50/);
      expect(formatAmount(1000)).toMatch(/\$1,000\.00/);
    });
  });

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      expect(validateAmount(100.5)).toEqual({ isValid: true });
      expect(validateAmount(0.01)).toEqual({ isValid: true });
      expect(validateAmount(999999.99)).toEqual({ isValid: true });
    });

    it('should reject negative amounts', () => {
      const result = validateAmount(-10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject amounts exceeding limit', () => {
      const result = validateAmount(1000000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject amounts with too many decimal places', () => {
      const result = validateAmount(100.123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

