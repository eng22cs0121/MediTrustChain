import { AuthApiError, PostgrestError } from '@supabase/supabase-js';

export interface AppError {
  message: string;
  title: string;
  code?: string;
  details?: string;
}

/**
 * Get user-friendly error message from Supabase Auth errors
 */
export function getAuthErrorMessage(error: unknown): AppError {
  if (error instanceof AuthApiError) {
    const code = error.status;
    const message = error.message;

    // Handle specific auth error codes
    switch (code) {
      case 400:
        if (message.includes('Email not confirmed')) {
          return {
            title: 'Email Not Confirmed',
            message: 'Please check your email and click the confirmation link to verify your account.',
            code: 'email_not_confirmed',
          };
        }
        if (message.includes('Invalid login credentials')) {
          return {
            title: 'Invalid Credentials',
            message: 'The email or password you entered is incorrect. Please try again.',
            code: 'invalid_credentials',
          };
        }
        if (message.includes('User already registered')) {
          return {
            title: 'Account Already Exists',
            message: 'An account with this email already exists. Please login instead.',
            code: 'user_already_exists',
          };
        }
        return {
          title: 'Invalid Request',
          message: message || 'The request was invalid. Please check your input and try again.',
          code: 'bad_request',
        };

      case 401:
        return {
          title: 'Unauthorized',
          message: 'Your session has expired. Please login again.',
          code: 'unauthorized',
        };

      case 403:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.',
          code: 'forbidden',
        };

      case 422:
        if (message.includes('Password')) {
          return {
            title: 'Weak Password',
            message: 'Password must be at least 6 characters long and contain a mix of letters and numbers.',
            code: 'weak_password',
          };
        }
        if (message.includes('Email')) {
          return {
            title: 'Invalid Email',
            message: 'Please enter a valid email address.',
            code: 'invalid_email',
          };
        }
        return {
          title: 'Validation Error',
          message: message || 'Please check your input and try again.',
          code: 'validation_error',
        };

      case 429:
        return {
          title: 'Too Many Attempts',
          message: 'Too many login attempts. Please wait a few minutes and try again.',
          code: 'rate_limit',
        };

      case 500:
      case 503:
        return {
          title: 'Server Error',
          message: 'Our servers are experiencing issues. Please try again in a few moments.',
          code: 'server_error',
        };

      default:
        return {
          title: 'Authentication Error',
          message: message || 'An error occurred during authentication. Please try again.',
          code: 'auth_error',
          details: error.message,
        };
    }
  }

  return {
    title: 'Authentication Error',
    message: 'An unexpected error occurred. Please try again.',
    code: 'unknown_auth_error',
  };
}

/**
 * Get user-friendly error message from Supabase Database errors
 */
export function getDatabaseErrorMessage(error: unknown): AppError {
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as PostgrestError;

    switch (dbError.code) {
      case '23505': // unique_violation
        return {
          title: 'Duplicate Entry',
          message: 'A record with this information already exists.',
          code: 'duplicate_entry',
        };

      case '23503': // foreign_key_violation
        return {
          title: 'Invalid Reference',
          message: 'This action references data that does not exist.',
          code: 'invalid_reference',
        };

      case '23502': // not_null_violation
        return {
          title: 'Missing Required Field',
          message: 'Please fill in all required fields.',
          code: 'missing_field',
        };

      case '42501': // insufficient_privilege
        return {
          title: 'Permission Denied',
          message: 'You do not have permission to perform this action.',
          code: 'permission_denied',
        };

      case 'PGRST116': // no rows found
        return {
          title: 'Not Found',
          message: 'The requested data could not be found.',
          code: 'not_found',
        };

      default:
        return {
          title: 'Database Error',
          message: dbError.message || 'An error occurred while accessing the database.',
          code: dbError.code,
          details: dbError.details,
        };
    }
  }

  return {
    title: 'Database Error',
    message: 'An unexpected database error occurred. Please try again.',
    code: 'unknown_db_error',
  };
}

/**
 * Get user-friendly error message from network errors
 */
export function getNetworkErrorMessage(): AppError {
  return {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    code: 'network_error',
  };
}

/**
 * Main error handler that determines error type and returns appropriate message
 */
export function handleError(error: unknown): AppError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return getNetworkErrorMessage();
  }

  // Auth errors
  if (error instanceof AuthApiError) {
    return getAuthErrorMessage(error);
  }

  // Database errors
  if (error && typeof error === 'object' && 'code' in error) {
    return getDatabaseErrorMessage(error);
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      code: 'generic_error',
    };
  }

  // Unknown errors
  return {
    title: 'Unknown Error',
    message: 'An unexpected error occurred. Please try again later.',
    code: 'unknown_error',
  };
}

/**
 * Log error to console (development) or error tracking service (production)
 */
export function logError(error: unknown, context?: string) {
  const errorDetails = handleError(error);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context || 'Error'}]:`, {
      error,
      details: errorDetails,
    });
  } else {
    // In production, send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { tags: { context } });
  }
}
