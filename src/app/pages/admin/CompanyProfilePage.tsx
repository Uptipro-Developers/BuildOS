import {
  Save,
  Upload,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getCompanyProfile,
  updateCompanyProfile,
} from "../../api/admin-extras";

const FALLBACK_COUNTRIES = [
  "Australia",
  "Canada",
  "France",
  "Germany",
  "Ghana",
  "India",
  "Kenya",
  "Nigeria",
  "South Africa",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
];

async function fetchCountryOptions(): Promise<string[]> {
  const res = await fetch("https://restcountries.com/v3.1/all?fields=name");
  if (!res.ok) throw new Error("Failed to fetch countries");

  const data = (await res.json()) as { name?: { common?: string } }[];
  return data
    .map((item) => item.name?.common?.trim())
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));
}

async function compressImage(
  file: File,
  maxWidth = 720,
  quality = 0.72,
): Promise<string> {
  const imageData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load image"));
    el.src = imageData;
  });

  const ratio = Math.min(1, maxWidth / img.width);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageData;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function CompanyProfilePage() {
  type RequiredField =
    | "companyName"
    | "email"
    | "phone"
    | "address"
    | "city"
    | "state"
    | "zipCode"
    | "country";

  type FormErrors = Partial<Record<RequiredField, string>>;

  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>(FALLBACK_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchCountryOptions()
      .then((list) => {
        if (list.length > 0) setCountries(list);
      })
      .catch(() => setCountries(FALLBACK_COUNTRIES));

    getCompanyProfile()
      .then((p) => {
        setFormData({
          companyName: p.name ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          zipCode: p.zipCode ?? "",
          country: p.country ?? "",
        });
        if (p.logoUrl) setLogoPreview(p.logoUrl);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as RequiredField;
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateGeneralInformation = (): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.companyName.trim())
      errors.companyName = "Company name is required.";
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^[+\d][\d\s\-().]{5,19}$/.test(formData.phone.trim())) {
      errors.phone = "Enter a valid phone number.";
    }
    if (!formData.address.trim()) errors.address = "Address is required.";
    if (!formData.city.trim()) errors.city = "City is required.";
    if (!formData.state.trim()) errors.state = "State / Province is required.";
    if (!formData.country.trim()) errors.country = "Country is required.";
    if (
      formData.zipCode.trim() &&
      !/^[a-zA-Z0-9\s\-]{3,10}$/.test(formData.zipCode.trim())
    ) {
      errors.zipCode = "Enter a valid ZIP / postal code.";
    }
    return errors;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage("Logo is too large. Please upload an image up to 5MB.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setLogoPreview(compressed);
      setSaveMessage(null);
    } catch {
      // Fallback for unsupported image formats.
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const validationErrors = validateGeneralInformation();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setSaveMessage("Please complete all required fields before saving.");
      return;
    }

    setFormErrors({});
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateCompanyProfile({
        name: formData.companyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country.trim(),
        logoUrl: logoPreview,
      });
      setSaveMessage("Company profile updated successfully.");
      toast.success("Company profile updated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      if (message.includes("413")) {
        setSaveMessage(
          "Upload is too large for the server. Try a smaller image and save again.",
        );
        toast.error(
          "Upload is too large for the server. Try a smaller image and save again.",
        );
      } else {
        setSaveMessage(message);
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Company Profile
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your organization's general information
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {saveMessage && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-700">
          {saveMessage}
        </div>
      )}

      {/* Company Logo */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Company Logo
        </h2>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Company Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <Building2 className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <div className="w-full sm:w-auto">
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Logo
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended: Square image, at least 512x512px
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, or SVG (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      {/* General Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          General Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.companyName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.companyName && (
              <p className="mt-1 text-xs text-red-600">
                {formErrors.companyName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.phone ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, country: e.target.value }));
                if (formErrors.country) {
                  setFormErrors((prev) => ({ ...prev, country: undefined }));
                }
              }}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.country ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {formErrors.country && (
              <p className="mt-1 text-xs text-red-600">{formErrors.country}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.address ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.address && (
              <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.city ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.city && (
              <p className="mt-1 text-xs text-red-600">{formErrors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State / Province <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.state ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.state && (
              <p className="mt-1 text-xs text-red-600">{formErrors.state}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP / Postal Code
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
                formErrors.zipCode ? "border-red-500" : "border-gray-300"
              }`}
            />
            {formErrors.zipCode && (
              <p className="mt-1 text-xs text-red-600">{formErrors.zipCode}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
