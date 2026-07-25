import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Building2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - in real app, this would call an API and check user role
    // For demo purposes, navigate to app launcher (admin view)
    navigate("/apps");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
    <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
      <div className="flex items-center justify-center mb-8">
        <Building2 className="w-10 h-10 text-blue-600 mr-3" />
        <h1 className="text-3xl text-gray-900">BuildOS</h1>
      </div>

      <h2 className="text-2xl mb-2 text-gray-900 text-center">Welcome Back</h2>
      <p className="text-gray-600 text-center mb-6">Log in to your account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">Password</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-gray-600">
            <input type="checkbox" className="mr-2" />
            Remember me
          </label>
          <a href="#" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors mt-6"
        >
          Log In
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/auth/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
    </div>
  );
}
