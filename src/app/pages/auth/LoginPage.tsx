import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../../api/client";
import { saveAuthSession } from "../../utils/authSession";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Load remembered credentials on mount
  const loadRememberedCredentials = () => {
    const saved = localStorage.getItem("buildos_remembered_creds");
    if (saved) {
      try {
        const { email } = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, email }));
        setRememberMe(true);
      } catch (e) {
        console.error("Failed to load remembered credentials", e);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      loadRememberedCredentials();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const baseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:3001/api"
      ).replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      if (!response.ok) {
        let serverMessage = "";
        try {
          const parsed = await response.json();
          const apiMessage = parsed?.message;
          serverMessage = Array.isArray(apiMessage)
            ? apiMessage.join(", ")
            : typeof apiMessage === "string"
              ? apiMessage
              : "";
        } catch {
          serverMessage = "";
        }

        // Deactivated / forbidden accounts get the server-provided explanation.
        // Bad credentials stay generic to avoid leaking account existence.
        const message =
          response.status === 403 && serverMessage
            ? serverMessage
            : response.status === 401
              ? "Invalid email or password."
              : serverMessage || "Unable to log in. Please try again.";
        throw new Error(message);
      }

      const res = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          name: string;
          email: string;
          role: string;
          assignedApps?: string[];
        };
      };
      saveAuthSession({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        user: res.user,
      });
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem(
          "buildos_remembered_creds",
          JSON.stringify({ email: formData.email.trim().toLowerCase() }),
        );
      } else {
        localStorage.removeItem("buildos_remembered_creds");
      }
      toast.success(
        res.user?.name
          ? `Welcome back, ${res.user.name}!`
          : "Logged in successfully.",
      );
      navigate("/apps");
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Invalid email or password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setForgotSuccess(true);
      setForgotEmail("");
      toast.success("If an account exists, a reset link has been sent.");
      setTimeout(() => {
        setShowForgotPasswordModal(false);
        setForgotSuccess(false);
      }, 3000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send password reset email.";
      setError(message);
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full min-w-md max-w-lg bg-white rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center mb-8">
          <Building2 className="w-10 h-10 text-blue-600 mr-3" />
          <h1 className="text-3xl text-gray-900">BuildOS</h1>
        </div>

        <h2 className="text-2xl mb-2 text-gray-900 text-center">
          Welcome Back
        </h2>
        <p className="text-gray-600 text-center mb-6">Log in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
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
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                className="mr-2"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        {/* <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/auth/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p> */}
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl mb-4 text-gray-900">Reset Password</h2>
            <p className="text-gray-600 text-sm mb-4">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-sm">
                ✓ Password reset email sent successfully. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@company.com"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {forgotLoading ? "Sending…" : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
