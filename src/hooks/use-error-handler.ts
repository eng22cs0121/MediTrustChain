import { useToast } from '@/hooks/use-toast';
import { handleError, logError } from '@/lib/error-handler';
import { useCallback } from 'react';

export function useErrorHandler() {
  const { toast } = useToast();

  const showError = useCallback(
    (error: unknown, context?: string) => {
      const errorDetails = handleError(error);
      logError(error, context);

      toast({
        variant: 'destructive',
        title: errorDetails.title,
        description: errorDetails.message,
      });

      return errorDetails;
    },
    [toast]
  );

  const showSuccess = useCallback(
    (title: string, description?: string) => {
      toast({
        title,
        description,
      });
    },
    [toast]
  );

  return {
    showError,
    showSuccess,
  };
}
