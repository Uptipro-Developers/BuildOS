import { useEffect, useState } from 'react';
import { getMyApplicationAccess, type DelegatedApp, type MyApplicationAccess } from '../api/responsibilities';

export function useApplicationResponsibility(app: DelegatedApp) {
  const [access, setAccess] = useState<MyApplicationAccess | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getMyApplicationAccess()
      .then((rows) => { if (active) setAccess(rows.find((row) => row.app === app) ?? null); })
      .catch(() => { if (active) setAccess(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [app]);
  return { access, loading, canConfigure: Boolean(access?.canConfigure), canAssign: Boolean(access?.canAssign) };
}
