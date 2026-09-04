import { Link } from "react-router";
import {
    Building2, DollarSign, ShoppingCart, Users, UserCircle,
    Settings, Store, LayoutGrid, ArrowRight, CheckCircle2, ShieldCheck,
    Layers, Globe2, HardHat,
    ClipboardCheck, Wallet, Workflow, Menu, X, Lock, Check,
} from "lucide-react";
import { useState, useEffect } from "react";
// ─── Data ─────────────────────────────────────────────────────────────────────

interface ModuleDef {
    id: string; name: string; tagline: string; href: string;
    icon: React.ElementType;
    accent: string; dim: string;
    metric: { value: string; label: string };
}

const MODULES: ModuleDef[] = [
    {
        id: "construction", name: "Projects", tagline: "Site execution · Timeline · Approvals",
        href: "/apps/construction", icon: Building2,
        accent: "#1d4ed8", dim: "#dbeafe",
        metric: { value: "₦12.8B", label: "live project budget" },
    },
    {
        id: "finance", name: "Finance", tagline: "Budgets · Expenses · Payroll",
        href: "/apps/finance", icon: DollarSign,
        accent: "#047857", dim: "#d1fae5",
        metric: { value: "₦340M", label: "headroom across budgets" },
    },
    {
        id: "procurement", name: "Procurement", tagline: "RFQ · PO · Vendor Management",
        href: "/apps/procurement", icon: ShoppingCart,
        accent: "#6d28d9", dim: "#ede9fe",
        metric: { value: "47", label: "active suppliers" },
    },
    {
        id: "storefront", name: "Storefront", tagline: "Inventory · Materials · Stores",
        href: "/apps/storefront", icon: Store,
        accent: "#0f766e", dim: "#ccfbf1",
        metric: { value: "247", label: "SKUs tracked live" },
    },
    {
        id: "hr", name: "HR", tagline: "People · Payroll · Leave",
        href: "/apps/hr", icon: Users,
        accent: "#b45309", dim: "#fef3c7",
        metric: { value: "156", label: "employees on platform" },
    },
    {
        id: "ess", name: "ESS", tagline: "Self-Service · Pay Slips · Requests",
        href: "/apps/ess", icon: UserCircle,
        accent: "#4338ca", dim: "#e0e7ff",
        metric: { value: "100%", label: "pay slip coverage" },
    },
    {
        id: "admin", name: "Admin", tagline: "Users · Roles · System Settings",
        href: "/apps/admin", icon: Settings,
        accent: "#334155", dim: "#e2e8f0",
        metric: { value: "100%", label: "system health" },
    },
];

const ROLES = [
    { icon: HardHat, name: "Construction Manager", role: "Run projects", point: "Track schedules, budgets and site approvals from one dashboard." },
    { icon: Wallet, name: "Accountant / Finance", role: "Close the books", point: "Post to a double-entry ledger that refuses to save an unbalanced entry." },
    { icon: ClipboardCheck, name: "Store Manager", role: "Control inventory", point: "Reorder levels, reusable assets and per-type stock accumulate automatically." },
    { icon: ShoppingCart, name: "Procurement Officer", role: "Source & deliver", point: "RFQs, formal POs with signatories, payment terms and GRNs in one flow." },
    { icon: Users, name: "HR Manager", role: "Manage people", point: "Grades, allowances and a payroll run that posts cleanly to Finance." },
    { icon: UserCircle, name: "Every Employee", role: "Self-serve", point: "Pay slips, leave and expense claims — no trips to the office." },
];

const TRUST = [
    "Only posted, approved transactions ever touch account balances.",
    "Drafts can never post. Every journal entry is balance-checked before save.",
    "Payment-term tranches must total exactly 100% before they can be saved.",
    "One shared source of truth — a PO created in Procurement appears automatically in Finance.",
];

const WORKFLOWS = [
    { step: "01", icon: ClipboardCheck, title: "Request & Approve", text: "Employees raise material, expense or leave requests. Managers approve in context — budgets, stock and policy baked in." },
    { step: "02", icon: ShoppingCart, title: "Procure & Receive", text: "RFQs to formal purchase orders with signatories, payment terms and goods-receipt tracking against ordered quantities." },
    { step: "03", icon: Wallet, title: "Invoice & Post", text: "Finance opens the invoice the moment a PO is sent over — pre-filled with payment term, amount due and SKU lines." },
    { step: "04", icon: Workflow, title: "Trace on the Ledger", text: "Every posting lands on a double-entry general ledger with full journal lines — Debits equal Credits, always." },
];

// ─── Landing Page ──────────────────────────────────────────────────────────────

export function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="landing min-h-screen bg-white text-slate-900 font-[DM_Sans,ui-sans-serif,system-ui] overflow-x-hidden">
            {/* Navbar */}
            <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm" : "bg-transparent"}`}>
                <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                    <a href="#top" className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-base font-extrabold">B</span>
                        <span className="text-lg font-bold tracking-tight">BuildOS</span>
                    </a>
                    <div className="hidden md:flex items-center gap-7 text-sm text-slate-600">
                        <a href="#modules" className="hover:text-slate-900 transition-colors">Modules</a>
                        <a href="#workflow" className="hover:text-slate-900 transition-colors">How it works</a>
                        <a href="#roles" className="hover:text-slate-900 transition-colors">Who it's for</a>
                        <a href="#integrity" className="hover:text-slate-900 transition-colors">Financial integrity</a>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/auth/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                            Sign in
                        </Link>
                        <a href="#demo" className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer">
                            Request a demo
                        </a>
                    </div>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" aria-label="Toggle menu">
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </nav>
                {menuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 space-y-1">
                        {[["Modules", "#modules"], ["How it works", "#workflow"], ["Who it's for", "#roles"], ["Financial integrity", "#integrity"]].map(([label, href]) => (
                            <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-slate-700 hover:text-slate-900">{label}</a>
                        ))}
                        <div className="pt-2 flex items-center gap-3">
                            <Link to="/auth/login" className="flex-1 text-center px-4 py-2 text-sm font-semibold border border-slate-200 text-slate-700 rounded-lg">Sign in</Link>
                            <a href="#demo" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg">Request a demo</a>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero */}
            <section id="top" className="relative pt-20 sm:pt-24 overflow-hidden">
                <div className="absolute -top-24 right-0 w-[520px] h-[520px] rounded-full bg-sky-100 blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute top-40 -left-24 w-[420px] h-[420px] rounded-full bg-cyan-100 blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{ backgroundImage: "linear-gradient(to right, #0ca5e912 1px, transparent 1px), linear-gradient(to bottom, #0ca5e912 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent pointer-events-none" />
                <div className="relative max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center py-12 sm:py-16">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-6 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                            </span>
                            The construction ERP built for Naira-scale build programmes
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-slate-900">
                            One system.
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600">
                                Every naira accounted for.
                            </span>
                        </h1>
                        <p className="mt-6 text-lg text-slate-600 max-w-lg leading-relaxed">
                            BuildOS puts a double-entry ledger, live budgets and store-level inventory behind every project —
                            so a posting can only ever be balanced, and you can always explain where the money went.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link to="/auth/login" className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all shadow-lg shadow-slate-900/10">
                                Launch BuildOS
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <a href="#modules" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white/60 text-sm font-semibold text-slate-700 transition-colors cursor-pointer">
                                Explore the modules
                            </a>
                        </div>
                        <p className="mt-4 text-xs text-slate-400">No download · Deploys in minutes · 7 modules, one workspace</p>
                    </div>

                    {/* Product preview */}
                    <div className="relative">
                        <div className="absolute -inset-3 bg-gradient-to-br from-sky-200 via-cyan-100 to-teal-100 rounded-3xl blur-2xl opacity-80 pointer-events-none" />
                        <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400" /><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="w-2 h-2 rounded-full bg-green-400" />
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">buildos.app / launcher</span>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-700">Workspace</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">All 7 modules live</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {MODULES.map((mod) => (
                                        <div key={mod.id} className="rounded-xl border border-slate-100 p-3.5 hover:shadow-md transition-shadow group cursor-default" style={{ background: `linear-gradient(135deg, ${mod.dim} 0%, #ffffff 60%)` }}>
                                            <div className="flex items-center justify-between">
                                                <mod.icon className="w-4.5 h-4.5" style={{ color: mod.accent }} />
                                                <span className="text-[10px] font-semibold" style={{ color: mod.accent }}>{mod.metric.value}</span>
                                            </div>
                                            <p className="mt-2 text-[13px] font-bold text-slate-800">{mod.name}</p>
                                            <p className="text-[10px] text-slate-500">{mod.tagline}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 text-white">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[11px] font-medium">Entry balanced</span>
                                    <span className="ml-auto text-[10px] text-slate-400 font-mono">DR 2110 AP · CR 1110 Cash ₦850,000</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust band */}
                <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { value: "₦17.2B", label: "of live construction portfolio" },
                        { value: "7", label: "integrated modules, one data layer" },
                        { value: "100%", label: "of entries balanced before post" },
                        { value: "0", label: "drafts ever touching the ledger" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl border border-slate-100 bg-white/80 backdrop-blur-sm p-4 hover:border-sky-200 transition-colors">
                            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{s.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Modules */}
            <section id="modules" className="py-20 sm:py-28 max-w-7xl mx-auto px-5 sm:px-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <p className="text-sm font-bold text-sky-600 uppercase tracking-wider">The platform</p>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
                            Seven modules. One workspace. Zero double-entry spreadsheets.
                        </h2>
                        <p className="mt-4 text-slate-600 leading-relaxed">
                            Everything a construction business touches — projects, money, procurement, people, materials —
                            lives in one connected product, styled like the modern apps your team already uses.
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Each application sold separately — <span className="font-semibold text-slate-800">Admin + ESS included</span> with every purchase
                        </p>
                    </div>
                    <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-sky-700 transition-colors shrink-0 group">
                        See it live
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MODULES.map((mod) => (
                        <Link key={mod.id} to={mod.href}
                            className="group relative rounded-2xl border border-slate-100 bg-white p-6 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 cursor-pointer">
                            <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${mod.accent}, transparent)` }} />
                            <div className="flex items-start justify-between">
                                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: mod.dim, color: mod.accent }}>
                                    <mod.icon className="w-5 h-5" />
                                </span>
                                <span className="text-right">
                                    <span className="block text-xl font-extrabold" style={{ color: mod.accent }}>{mod.metric.value}</span>
                                    <span className="block text-[11px] text-slate-500">{mod.metric.label}</span>
                                </span>
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-slate-900 flex items-center gap-2">
                                {mod.name}
                                {(mod.id === "ess" || mod.id === "admin") && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-wide">
                                        <Lock className="w-3 h-3" /> Included
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">{mod.tagline}</p>
                            <span className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${(mod.id === "ess" || mod.id === "admin") ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-900"}`}>
                                {(mod.id === "ess" || mod.id === "admin") ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" /> Included with every module
                                    </>
                                ) : (
                                    <>
                                        Open module
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </span>
                        </Link>
                    ))}

                    {/* CTA card */}
                    <div className="rounded-2xl bg-slate-900 text-white p-6 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
                        <div>
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3">
                                <LayoutGrid className="w-3.5 h-3.5" /> Your team here
                            </span>
                            <h3 className="text-lg font-bold">Roles for everyone on the build</h3>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">From the accountant closing a month-end to the store manager counting stock — one login, one context.</p>
                        </div>
                        <Link to="/auth/login" className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition-colors">
                            Sign in to your workspace
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Modular — sold separately, Admin + ESS always included */}
            <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Modular by design</p>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-balance">
                                Buy one module. Or the whole suite. <span className="text-slate-400 font-extrabold">Admin + ESS always included.</span>
                            </h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                Each BuildOS application — <span className="font-semibold text-slate-800">Projects</span>, <span className="font-semibold text-slate-800">Finance</span>, <span className="font-semibold text-slate-800">Procurement</span>, <span className="font-semibold text-slate-800">Storefront</span> and <span className="font-semibold text-slate-800">HR</span> — is available as a standalone product.
                                Whichever you choose, <span className="font-semibold text-slate-800">Admin</span> and <span className="font-semibold text-slate-800">ESS</span> come included, so user management, permissions and employee self-service are ready from day one. Add more modules as your operations grow.
                            </p>
                            <ul className="mt-6 space-y-2.5 text-sm">
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </span>
                                    <span className="text-slate-600"><span className="font-semibold text-slate-800">Start focused:</span> solve the pain you feel today, not the suite you might need tomorrow.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </span>
                                    <span className="text-slate-600"><span className="font-semibold text-slate-800">Scale without rework:</span> modules share one data layer — add a new one and it lights up with your existing projects and ledger.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </span>
                                    <span className="text-slate-600"><span className="font-semibold text-slate-800">No plan jargon:</span> tell us your mix, we configure your suite. Pricing is per-module.</span>
                                </li>
                            </ul>
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <a href="#demo" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors">
                                    Talk to us about your suite
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                                <span className="text-xs text-slate-400">We’ll propose the right mix for your company.</span>
                            </div>
                        </div>

                        {/* Suite builder mock */}
                        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
                            <div className="absolute -top-3 -right-3 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Your suite</p>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3" /> Always included
                                    </p>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {MODULES.filter(m => m.id === "admin" || m.id === "ess").map(m => (
                                            <div key={m.id} className="rounded-xl bg-white border border-emerald-200 p-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.dim, color: m.accent }}>
                                                        <m.icon className="w-4 h-4" />
                                                    </span>
                                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Included</span>
                                                </div>
                                                <p className="mt-2.5 text-sm font-bold text-slate-900">{m.name}</p>
                                                <p className="text-[11px] text-slate-500">{m.tagline}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Choose any combination</p>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {MODULES.filter(m => !["admin", "ess"].includes(m.id)).map(m => (
                                            <div key={m.id} className="rounded-xl bg-white border border-slate-200 p-3.5 hover:border-slate-300 transition-colors">
                                                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.dim, color: m.accent }}>
                                                    <m.icon className="w-4 h-4" />
                                                </span>
                                                <p className="mt-2.5 text-sm font-bold text-slate-900">{m.name}</p>
                                                <p className="text-[11px] text-slate-500">{m.tagline.split(" ·")[0]}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="mt-5 text-center text-xs text-slate-400">Mix and match — we configure your suite on purchase. No per-seat plan tiers.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Workflow */}
            <section id="workflow" className="py-20 sm:py-28 bg-slate-50 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="max-w-2xl mb-12">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <p className="text-sm font-bold text-sky-600 uppercase tracking-wider">How it works</p>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
                            From a site request to a posted journal entry — without leaving the room.
                        </h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {WORKFLOWS.map((w, i) => (
                            <div key={w.step} className="relative rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                        <w.icon className="w-5 h-5" />
                                    </span>
                                    <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-sky-50 text-sky-600">{w.step}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900">{w.title}</h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{w.text}</p>
                                {i < WORKFLOWS.length - 1 && (
                                    <ArrowRight className="hidden lg:block absolute top-1/2 -right-[18px] -translate-y-1/2 w-4 h-4 text-slate-200 z-10" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Financial integrity */}
            <section id="integrity" className="py-20 sm:py-28 max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <p className="text-sm font-bold text-sky-600 uppercase tracking-wider">Financial integrity</p>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
                        The ledger that refuses to be out of balance.
                    </h2>
                    <p className="mt-4 text-slate-600 leading-relaxed">
                        Accounting is unforgiving, so the product is designed to be just as strict. Every journal entry is
                        checked against itself before it can be saved — Debits must equal Credits, drafts can never reach
                        the ledger, and payment terms must total 100% before they exist.
                    </p>
                    <div className="mt-8 space-y-3">
                        {TRUST.map((t) => (
                            <div key={t} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-slate-700 leading-relaxed">{t}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute -inset-3 bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 rounded-3xl blur-2xl opacity-80 pointer-events-none" />
                    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400" /> Journal entry · JE-0042</span>
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Balanced ✓</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {[
                                ["5100 Material Costs", "Debit", "₦850,000"],
                                ["2110 Accounts Payable", "Credit", "₦850,000"],
                                ["2130 VAT Payable", "Credit", "₦127,500"],
                                ["2140 WHT Payable", "Credit", "₦42,500"],
                            ].map(([acct, side, amt]) => (
                                <div key={acct} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{acct}</p>
                                        <p className="text-[10px] text-slate-400">{side}</p>
                                    </div>
                                    <span className={`text-sm font-bold ${side === "Debit" ? "text-slate-900" : "text-emerald-600"}`}>{amt}</span>
                                </div>
                            ))}
                            <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Totals</span>
                                <span className="text-xs font-bold text-slate-900">₦1,020,000 = ₦1,020,000</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section id="roles" className="py-20 sm:py-28 bg-slate-900 text-white border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="max-w-2xl mb-12">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            <p className="text-sm font-bold text-sky-400 uppercase tracking-wider">Who it's for</p>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
                            Built for every seat on the build.
                        </h2>
                        <p className="mt-4 text-slate-400 leading-relaxed">
                            Each role sees the workspace their job demands — approvals for the manager, the ledger for the
                            accountant, the store for the storekeeper.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ROLES.map((r) => (
                            <div key={r.name} className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 transition-all duration-200 hover:border-sky-500/50 hover:bg-slate-800 cursor-default">
                                <span className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center text-sky-300 mb-4">
                                    <r.icon className="w-5 h-5" />
                                </span>
                                <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">{r.role}</p>
                                <h3 className="text-lg font-bold mt-0.5 text-white">{r.name}</h3>
                                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{r.point}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section id="demo" className="relative">
                <div className="absolute inset-0 bg-slate-900" />
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600" />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
                <div className="relative max-w-5xl mx-auto px-5 sm:px-8 py-24 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white/95 text-xs font-semibold mb-6">
                        <Globe2 className="w-3.5 h-3.5 text-sky-100" />
                        Built for your whole build programme
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight text-balance">
                        Your build programme, accounted for.
                    </h2>
                    <p className="mt-5 text-lg text-sky-50 max-w-2xl mx-auto leading-relaxed">
                        Sign in and walk the same workflows your CFO, store manager and site teams will use —
                        live, with real numbers.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                        <Link to="/auth/login" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition-all shadow-lg shadow-black/10">
                            Sign in to BuildOS
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link to="/auth/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                            Create an account
                        </Link>
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-slate-50/60 py-12">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-sm font-extrabold">B</span>
                                <span className="text-sm font-bold text-slate-900">BuildOS</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                                The construction ERP that keeps every naira accounted for — projects, finance, procurement, people and materials in one workspace.
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Modules</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {MODULES.map((m) => (
                                    <Link key={m.id} to={m.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full" style={{ background: m.accent }} />{m.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Company</p>
                            <div className="space-y-2">
                                <a href="#modules" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">Why BuildOS</a>
                                <a href="#workflow" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">How it works</a>
                                <a href="#roles" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">Who it's for</a>
                                <a href="#integrity" className="block text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">Financial integrity</a>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Get started</p>
                            <div className="space-y-2">
                                <Link to="/auth/login" className="block text-sm font-medium text-slate-700 hover:text-sky-700 transition-colors">Sign in</Link>
                                <Link to="/auth/signup" className="block text-sm font-medium text-slate-700 hover:text-sky-700 transition-colors">Create an account</Link>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">© {new Date().getFullYear()} BuildOS · Built for the modern construction company</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Double-entry by default</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-500" /> Balanced before post, always</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}