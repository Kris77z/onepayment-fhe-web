/**
 * FHE (Fully Homomorphic Encryption) Utilities
 * Provides functions to interact with the FHE service API
 */

const FHE_API_BASE_URL = process.env.NEXT_PUBLIC_FHE_API_URL || 'http://localhost:8001';

export interface EncryptRequest {
  amount: number;
}

export interface EncryptResponse {
  ciphertext: string;
  public_key?: string | null;
}

export interface DecryptRequest {
  ciphertext: string;
}

export interface DecryptResponse {
  amount: number;
}

export class FHEError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'FHEError';
  }
}

/**
 * Encrypt a payment amount using FHE
 * 
 * @param amount - Payment amount to encrypt (0.01 to 999,999.99)
 * @returns Encrypted ciphertext as base64 string
 * @throws FHEError if encryption fails
 */
export async function encryptAmount(amount: number): Promise<string> {
  // Validate amount
  if (amount <= 0) {
    throw new FHEError('Amount must be greater than 0', 400);
  }
  if (amount > 999999.99) {
    throw new FHEError('Amount must be less than or equal to 999,999.99', 400);
  }
  if (Math.round(amount * 100) / 100 !== amount) {
    throw new FHEError('Amount must have at most 2 decimal places', 400);
  }

  try {
    const response = await fetch(`${FHE_API_BASE_URL}/api/fhe/encrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FHEError(
        errorData.detail || `Encryption failed: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data: EncryptResponse = await response.json();
    return data.ciphertext;
  } catch (error) {
    if (error instanceof FHEError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FHEError(
        'Failed to connect to FHE service. Please ensure the service is running.',
        503
      );
    }
    throw new FHEError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Decrypt a ciphertext to get the payment amount
 * 
 * @param ciphertext - Base64 encoded ciphertext
 * @returns Decrypted payment amount
 * @throws FHEError if decryption fails
 */
export async function decryptAmount(ciphertext: string): Promise<number> {
  if (!ciphertext || ciphertext.length === 0) {
    throw new FHEError('Ciphertext cannot be empty', 400);
  }

  try {
    const response = await fetch(`${FHE_API_BASE_URL}/api/fhe/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ciphertext }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FHEError(
        errorData.detail || `Decryption failed: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data: DecryptResponse = await response.json();
    return data.amount;
  } catch (error) {
    if (error instanceof FHEError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FHEError(
        'Failed to connect to FHE service. Please ensure the service is running.',
        503
      );
    }
    throw new FHEError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Check if FHE service is available
 * 
 * @returns True if service is healthy, false otherwise
 */
export async function checkFHEHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${FHE_API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Format amount for display
 * 
 * @param amount - Payment amount
 * @returns Formatted string (e.g., "$100.50")
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate payment amount
 * 
 * @param amount - Amount to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > 999999.99) {
    return { isValid: false, error: 'Amount must be less than or equal to $999,999.99' };
  }
  if (Math.round(amount * 100) / 100 !== amount) {
    return { isValid: false, error: 'Amount must have at most 2 decimal places' };
  }
  return { isValid: true };
}

