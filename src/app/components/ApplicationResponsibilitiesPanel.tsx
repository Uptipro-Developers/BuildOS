import { useEffect, useMemo, useState } from 'react';
import { Crown, Plus, ShieldCheck, Trash2, UserRoundCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, type AppUser as AdminUser } from '../api/admin-extras';
import {
  createApplicationAssignment, getApplicationAssignments, getApplicationOwners,
  getMyApplicationAccess, getResponsibilityProcesses, getResponsibilityResources,
  revokeApplicationAssignment, type ApplicationAssignment, type ApplicationOwner,
  type DelegatedApp, type ResponsibilityProcess,
} from '../api/responsibilities';

const LABELS: Record<DelegatedApp, string> = { construction: 'Projects', storefront: 'Storefront', procurement: 'Procurement', finance: 'Finance', hr: 'HR' };
const ACTION_LABELS: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', approve: 'Approve', delete: 'Delete' };
type Resource = { id: string; name: string };

export function ApplicationResponsibilitiesPanel({ app }: { app: DelegatedApp }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [owners, setOwners] = useState<ApplicationOwner[]>([]);
  const [assignments, setAssignments] = useState<ApplicationAssignment[]>([]);
  const [processes, setProcesses] = useState<ResponsibilityProcess[]>([]);
  const [resources, setResources] = useState<Record<string, Resource[]>>({});
  const [canAssign, setCanAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ userId: '', processId: '', permissions: [] as string[], scopeType: 'application', scopeIds: [] as string[] });

  const load = async () => {
    setLoading(true);
    try {
      const [userRows, ownerRows, assignmentRows, access, processRows] = await Promise.all([
        getUsers(), getApplicationOwners(app), getApplicationAssignments(app), getMyApplicationAccess(), getResponsibilityProcesses(app),
      ]);
      setUsers(userRows.filter((user) => String(user.status ?? '').toLowerCase() !== 'inactive'));
      setOwners(ownerRows); setAssignments(assignmentRows); setProcesses(processRows);
      setCanAssign(Boolean(access.find((entry) => entry.app === app)?.canAssign));
    } catch (error: any) { toast.error(error?.message || 'Failed to load people and responsibilities'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [app]);
  useEffect(() => { setForm({ userId: '', processId: '', permissions: [], scopeType: 'application', scopeIds: [] }); setResources({}); }, [app]);

  const selectedProcess = processes.find((process) => process.id === form.processId);
  const activeOwners = owners.filter((owner) => owner.active);
  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active');
  const scopeResources = resources[form.scopeType] ?? [];
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const chooseProcess = (processId: string) => {
    const process = processes.find((row) => row.id === processId);
    const permissions = process?.actions.includes('view') ? ['view'] : process?.actions.slice(0, 1) ?? [];
    setForm((current) => ({ ...current, processId, permissions, scopeType: 'application', scopeIds: [] }));
  };
  const chooseScope = async (scopeType: string) => {
    setForm((current) => ({ ...current, scopeType, scopeIds: [] }));
    if (scopeType === 'application' || resources[scopeType]) return;
    try {
      const rows = await getResponsibilityResources(app, scopeType);
      setResources((current) => ({ ...current, [scopeType]: rows }));
    }
    catch (error: any) { toast.error(error?.message || `Could not load ${scopeType} records`); }
  };
  const toggleAction = (action: string) => setForm((current) => ({ ...current, permissions: current.permissions.includes(action) ? current.permissions.filter((item) => item !== action) : [...current.permissions, action] }));
  const toggleResource = (id: string) => setForm((current) => ({ ...current, scopeIds: current.scopeIds.includes(id) ? current.scopeIds.filter((item) => item !== id) : [...current.scopeIds, id] }));

  const assign = async () => {
    if (!form.userId) return toast.error('Choose a person');
    if (!selectedProcess) return toast.error('Choose a process');
    if (!form.permissions.length) return toast.error('Choose at least one permitted action');
    if (form.scopeType !== 'application' && !form.scopeIds.length) return toast.error(`Choose at least one ${form.scopeType}`);
    setSaving(true);
    try {
      const selectedResources: Array<string | null> = form.scopeType === 'application' ? [null] : form.scopeIds;
      await Promise.all(selectedResources.map((scopeId) => {
        const resource = scopeResources.find((item) => item.id === scopeId);
        return createApplicationAssignment(app, {
          userId: form.userId, processId: selectedProcess.id, permissions: form.permissions,
          scopeType: form.scopeType, scopeId, scopeName: scopeId ? resource?.name ?? scopeId : `All ${selectedProcess.label}`,
        });
      }));
      toast.success(`${selectedProcess.label} responsibility assigned to ${usersById.get(form.userId)?.name ?? 'user'}`);
      setForm({ userId: '', processId: '', permissions: [], scopeType: 'application', scopeIds: [] });
      await load();
    } catch (error: any) { toast.error(error?.message || 'Could not create the assignment'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><UserRoundCog className="w-5 h-5 text-indigo-600" /> People & Responsibilities</h2><p className="text-sm text-gray-500 mt-1">Delegate existing {LABELS[app]} processes and, where relevant, limit responsibility to selected records.</p></div>
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> Module point person</h3></div>
      <div className="p-5 space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && activeOwners.length === 0 && <p className="text-sm text-gray-500">{owners.length === 0 ? 'Admin has not appointed a point person yet.' : 'There is no active point person. Existing assignments remain in force.'}</p>}
        {activeOwners.map((owner) => <div key={owner.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"><div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold">{owner.user.name.slice(0, 1)}</div><div><p className="text-sm font-medium text-gray-900">{owner.user.name}</p><p className="text-xs text-gray-500">{owner.user.email}</p></div></div>)}
      </div>
    </section>
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" /> Process delegation</h3><p className="text-xs text-gray-500 mt-1">Delegated actions remain subject to the person’s existing role and user permission settings.</p></div>
      <div className="p-5 space-y-5">
        {canAssign && <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-medium text-gray-600">Person</span><select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select person</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-medium text-gray-600">{LABELS[app]} process</span><select value={form.processId} onChange={(event) => chooseProcess(event.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="">Select process</option>{processes.map((process) => <option key={process.id} value={process.id}>{process.label}</option>)}</select></label>
          </div>
          {selectedProcess && <>
            <div><p className="text-xs font-medium text-gray-600 mb-2">Permitted actions</p><div className="flex flex-wrap gap-2">{selectedProcess.actions.map((action) => <button type="button" key={action} onClick={() => toggleAction(action)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.permissions.includes(action) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-300'}`}>{ACTION_LABELS[action] ?? action}</button>)}</div></div>
            <div><p className="text-xs font-medium text-gray-600 mb-2">Responsibility scope</p><div className="flex flex-wrap gap-2">{selectedProcess.scopeTypes.map((scope) => <button type="button" key={scope} onClick={() => void chooseScope(scope)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize ${form.scopeType === scope ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-600'}`}>{scope === 'application' ? `All ${selectedProcess.label}` : `Selected ${scope}s`}</button>)}</div></div>
            {form.scopeType !== 'application' && <div className="rounded-lg border border-gray-200 bg-white max-h-44 overflow-y-auto p-2">{scopeResources.length === 0 ? <p className="text-xs text-gray-400 p-2">No {form.scopeType} records available.</p> : scopeResources.map((resource) => <label key={resource.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={form.scopeIds.includes(resource.id)} onChange={() => toggleResource(resource.id)} className="rounded border-gray-300 text-indigo-600" /><span className="text-sm text-gray-700">{resource.name}</span></label>)}</div>}
          </>}
          <div className="flex justify-end"><button onClick={assign} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"><Plus className="w-4 h-4" /> {saving ? 'Assigning…' : 'Add responsibility'}</button></div>
        </div>}
        {!canAssign && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">Only the appointed {LABELS[app]} point person can delegate processes.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-y border-gray-200"><tr><th className="text-left px-4 py-2.5">Person</th><th className="text-left px-4 py-2.5">Process</th><th className="text-left px-4 py-2.5">Actions</th><th className="text-left px-4 py-2.5">Scope</th><th className="text-left px-4 py-2.5">Assigned by</th><th className="w-12" /></tr></thead><tbody className="divide-y divide-gray-100">{activeAssignments.map((assignment) => <tr key={assignment.id}><td className="px-4 py-3"><p className="font-medium text-gray-900">{assignment.user.name}</p><p className="text-xs text-gray-500">{assignment.user.email}</p></td><td className="px-4 py-3 font-medium text-gray-700">{assignment.processName || assignment.processId || 'Legacy module access'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{assignment.permissions.map((action) => <span key={action} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{ACTION_LABELS[action] ?? action}</span>)}</div></td><td className="px-4 py-3">{assignment.scopeType === 'application' ? 'All records' : assignment.scopeName || assignment.scopeId}</td><td className="px-4 py-3 text-gray-500">{assignment.assignedBy?.name || 'Admin'}</td><td className="px-2">{canAssign && <button onClick={async () => { await revokeApplicationAssignment(assignment.id); toast.success('Assignment removed'); await load(); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remove assignment"><Trash2 className="w-4 h-4" /></button>}</td></tr>)}</tbody></table>{!loading && activeAssignments.length === 0 && <p className="text-sm text-gray-500 text-center py-8"><ShieldCheck className="w-5 h-5 mx-auto mb-2 text-gray-300" />No process responsibilities assigned yet.</p>}</div>
      </div>
    </section>
  </div>;
}
