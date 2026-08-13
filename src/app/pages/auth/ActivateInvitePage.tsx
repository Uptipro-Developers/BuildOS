import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001/api"
).replace(/\/$/, "");

function parseErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(" ");
    if (typeof parsed.message === "string") return parsed.message;
    return raw;
  } catch {
    return raw;
  }
}

export function ActivateInvitePage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Activation token is missing from the link.");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        "Password must be at least 8 characters and include letters, numbers, and symbols.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(parseErrorMessage(raw) || "Activation failed.");
      }

      setSuccess("Account activated successfully. You can now log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
      <div className="flex items-center justify-center mb-8">
        <Building2 className="w-10 h-10 text-blue-600 mr-3" />
        <h1 className="text-3xl text-gray-900">BuildOS</h1>
      </div>

      <h2 className="text-2xl mb-2 text-gray-900 text-center">
        Activate Account
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Set your password to complete your invitation.
      </p>

      {!token && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          Activation link is invalid. Please request a new invite.
        </p>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{success}</span>
          </div>
          <Link
            to="/auth/login"
            className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              At least 8 characters, including letters, numbers, and symbols.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </form>
      )}
    </div>
  );
}
