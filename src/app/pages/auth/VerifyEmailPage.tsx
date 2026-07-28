import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, CheckCircle } from "lucide-react";
import { apiFetch } from "../../api/client";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ verified: boolean }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: otp }),
      });
      setVerified(true);
      setTimeout(() => navigate("/apps"), 2000);
    } catch {
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl mb-2 text-gray-900">Email Verified!</h2>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
      <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
      <h2 className="text-2xl mb-2 text-gray-900 text-center">
        Verify Your Email
      </h2>
      <p className="text-gray-600 text-center mb-6">
        We've sent a verification code to your email address
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700 text-center">
            Enter 6-digit code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            placeholder="000000"
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors mt-6 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify Email"}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        Didn't receive the code?{" "}
        <button className="text-blue-600 hover:underline">Resend</button>
      </p>
    </div>
  );
}
