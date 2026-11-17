import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { DelegatedApp } from '../api/responsibilities';
import { useApplicationResponsibility } from '../utils/useApplicationResponsibility';

const FALLBACK: Record<DelegatedApp, string> = {
  construction: '/apps/construction/dashboard',
  storefront: '/apps/storefront/dashboard',
  procurement: '/apps/procurement/dashboard',
  finance: '/apps/finance/dashboard',
  hr: '/apps/hr/dashboard',
};

export function ApplicationSettingsGuard({ app, children }: { app: DelegatedApp; children: ReactNode }) {
  const { loading, canConfigure } = useApplicationResponsibility(app);
  if (loading) return <div className="py-12 text-center text-sm text-gray-500">Checking settings access…</div>;
  if (!canConfigure) return <Navigate to={FALLBACK[app]} replace />;
  return children;
}
