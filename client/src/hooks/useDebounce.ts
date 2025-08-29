import { useState, useEffect, useCallback } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useAsyncValidation = <T>(
  validateFn: (value: T) => Promise<{ available: boolean; message: string }>,
  delay: number = 500
) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<{ available?: boolean; message?: string }>({});

  const validate = useCallback(async (value: T) => {
    if (!value) {
      setValidation({});
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateFn(value);
      setValidation(result);
    } catch (error) {
      setValidation({ available: false, message: 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  }, [validateFn]);

  const debouncedValidate = useCallback((value: T) => {
    const timer = setTimeout(() => validate(value), delay);
    return () => clearTimeout(timer);
  }, [validate, delay]);

  return { validation, isValidating, debouncedValidate };
};
