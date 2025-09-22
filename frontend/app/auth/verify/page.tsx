"use client";

import { useState, useEffect } from "react";
import { VerificationInput } from "@/components/auth/VerificationInput";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";
  const phone = searchParams.get("phone");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
      return;
    }
  }, [countdown]);

  const handleCodeComplete = async (verificationCode: string) => {
    setIsLoading(true);
    setError("");

    try {
      // TODO: Submit to API
      console.log("Verification code submitted:", verificationCode);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate success/failure
      if (verificationCode === "123456") {
        // Success - redirect to dashboard or next step
        console.log("Verification successful");
        window.location.href = "/eatery";
        return;
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
    }

    setIsLoading(false);
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    try {
      // TODO: Submit to API
      console.log("Resending verification code");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCanResend(false);
      setCountdown(30);
      setError("");
    } catch (error) {
      setError("Failed to resend code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-4">Type a Verification Code that we have sent</h1>
          <p className="text-gray-400">Enter your Verification Code below.</p>
        </div>

        <div className="space-y-6">
          <VerificationInput length={6} onChange={setCode} onComplete={handleCodeComplete} />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            onClick={() => handleCodeComplete(code)}
            disabled={code.length !== 6 || isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify Now"}
          </Button>

          <Button
            onClick={handleResendCode}
            disabled={!canResend}
            className="w-full bg-transparent border-2 border-gray-700 text-gray-300 hover:border-gray-600 font-medium py-3 rounded-xl disabled:opacity-50"
          >
            {canResend ? "Resend Code" : `Resend Code (${countdown}s)`}
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          We sent a verification code to {phone ? `your phone number ending in ${phone.slice(-4)}` : email}
        </p>
      </div>
    </div>
  );
}
