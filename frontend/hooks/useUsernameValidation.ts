import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { checkUsernameAvailability } from "@/app/actions/update-profile";
import { UsernameSchema } from "@/lib/validators/profile";

interface UsernameValidationState {
  isValid: boolean;
  isAvailable: boolean | null;
  isChecking: boolean;
  error: string | null;
}

export function useUsernameValidation(initialUsername: string = "") {
  const [username, setUsername] = useState(initialUsername);
  const [validationState, setValidationState] = useState<UsernameValidationState>({
    isValid: false,
    isAvailable: null,
    isChecking: false,
    error: null,
  });

  // Debounce the username to avoid too many API calls
  const debouncedUsername = useDebounce(username, 500);

  // Validate username format
  const validateUsernameFormat = useCallback((value: string): boolean => {
    if (!value) return false;
    
    const result = UsernameSchema.safeParse({ username: value });
    return result.success;
  }, []);

  // Check username availability - memoized to prevent infinite re-renders
  const checkAvailability = useMemo(() => {
    return async (value: string) => {
      if (!value || !validateUsernameFormat(value)) {
        setValidationState(prev => ({
          ...prev,
          isAvailable: null,
          isChecking: false,
          error: null,
        }));
        return;
      }

      setValidationState(prev => ({
        ...prev,
        isChecking: true,
        error: null,
      }));

      try {
        const result = await checkUsernameAvailability(value);
        
        if (result.error) {
          setValidationState(prev => ({
            ...prev,
            isAvailable: false,
            isChecking: false,
            error: result.error,
          }));
        } else {
          setValidationState(prev => ({
            ...prev,
            isAvailable: result.available ?? null,
            isChecking: false,
            error: result.available ? null : "Username is already taken",
          }));
        }
      } catch (error) {
        setValidationState(prev => ({
          ...prev,
          isAvailable: false,
          isChecking: false,
          error: "Failed to check username availability",
        }));
      }
    };
  }, [validateUsernameFormat]);

  // Effect to check availability when debounced username changes
  useEffect(() => {
    if (debouncedUsername !== username) return;

    const isValid = validateUsernameFormat(debouncedUsername);
    
    setValidationState(prev => ({
      ...prev,
      isValid,
    }));

    if (isValid) {
      checkAvailability(debouncedUsername);
    } else {
      setValidationState(prev => ({
        ...prev,
        isAvailable: null,
        isChecking: false,
        error: debouncedUsername ? "Invalid username format" : null,
      }));
    }
  }, [debouncedUsername, username, validateUsernameFormat, checkAvailability]);

  // Reset validation state
  const resetValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      isAvailable: null,
      isChecking: false,
      error: null,
    });
  }, []);

  // Get validation message
  const getValidationMessage = useCallback(() => {
    if (validationState.isChecking) {
      return "Checking availability...";
    }
    
    if (validationState.error) {
      return validationState.error;
    }
    
    if (validationState.isAvailable === true) {
      return "Username is available";
    }
    
    if (validationState.isAvailable === false) {
      return "Username is already taken";
    }
    
    return "";
  }, [validationState]);

  // Get validation status
  const getValidationStatus = useCallback(() => {
    if (validationState.isChecking) {
      return "checking";
    }
    
    if (validationState.error) {
      return "error";
    }
    
    if (validationState.isAvailable === true) {
      return "available";
    }
    
    if (validationState.isAvailable === false) {
      return "unavailable";
    }
    
    return "idle";
  }, [validationState]);

  return {
    username,
    setUsername,
    validationState,
    resetValidation,
    getValidationMessage,
    getValidationStatus,
    isValid: validationState.isValid && validationState.isAvailable === true,
  };
}
