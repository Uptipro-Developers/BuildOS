import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../../api/client";
import { ConfirmationModal } from "../../components/ConfirmationModal";

interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
}

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function BaseCalendarPage() {
  const [year, setYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(3); // April
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newHol, setNewHol] = useState({
    name: "",
    date: "",
    recurring: false,
  });
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([0, 6]); // Sun + Sat
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  useEffect(() => {
    apiFetch<Holiday[]>("/holidays")
      .then((data) => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]));
  }, []);

  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === selectedMonth;
  });

  const firstDay = new Date(year, selectedMonth, 1).getDay();
  const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function holidayForDay(day: number) {
    const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.find((h) => h.date === dateStr);
  }

  function isWeekend(day: number) {
    return nonWorkingDays.includes(new Date(year, selectedMonth, day).getDay());
  }

  function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!newHol.name.trim() || !newHol.date) return;
    apiFetch("/holidays", {
      method: "POST",
      body: JSON.stringify({
        name: newHol.name,
        date: newHol.date,
        recurring: newHol.recurring,
      }),
    })
      .then((created: any) => {
        setHolidays((prev) => [
          ...prev,
          {
            id: created?.id ?? `h${Date.now()}`,
            name: newHol.name,
            date: newHol.date,
            recurring: newHol.recurring,
          },
        ]);
        setNewHol({ name: "", date: "", recurring: false });
        setShowAdd(false);
      })
      .catch((err) => {
        alert("Failed to add holiday. Please try again.");
        console.error(err);
      });
  }

  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setYear((y) => y - 1);
    } else setSelectedMonth((m) => m - 1);
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setYear((y) => y + 1);
    } else setSelectedMonth((m) => m + 1);
  }

  function removeHoliday(id: string) {
    apiFetch(`/holidays/${id}`, { method: "DELETE" })
      .then(() => setHolidays((prev) => prev.filter((x) => x.id !== id)))
      .catch((err) => {
        alert("Failed to delete holiday. Please try again.");
        console.error(err);
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Base Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define working days, public holidays, and leave calculation rules
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Add Public Holiday
          </h3>
          <form
            onSubmit={addHoliday}
            className="flex items-end gap-4 flex-wrap"
          >
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Holiday Name *
              </label>
              <input
                required
                value={newHol.name}
                onChange={(e) =>
                  setNewHol((n) => ({ ...n, name: e.target.value }))
                }
                placeholder="e.g. Foundation Day"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date *
              </label>
              <input
                required
                type="date"
                value={newHol.date}
                onChange={(e) =>
                  setNewHol((n) => ({ ...n, date: e.target.value }))
                }
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={newHol.recurring}
                onChange={(e) =>
                  setNewHol((n) => ({ ...n, recurring: e.target.checked }))
                }
                className="rounded accent-indigo-600"
              />
              Recurring annually
            </label>
            <div className="flex gap-2 pb-0.5">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900">
              {FULL_MONTHS[selectedMonth]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-1 ${nonWorkingDays.includes(i) ? "text-gray-300" : "text-gray-500"}`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-10" />;
              const hol = holidayForDay(day);
              const weekend = isWeekend(day);
              return (
                <div
                  key={i}
                  title={hol?.name}
                  className={`h-10 flex flex-col items-center justify-center text-sm rounded-lg relative select-none
                    ${hol ? "bg-red-50 ring-1 ring-red-200" : weekend ? "bg-gray-50" : "hover:bg-gray-50"}
                    ${weekend ? "text-gray-300" : hol ? "text-red-700 font-medium" : "text-gray-700"}
                  `}
                >
                  {day}
                  {hol && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-5 mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-50 ring-1 ring-red-200 inline-block" />{" "}
              Public Holiday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-50 inline-block border border-gray-200" />{" "}
              Non-working day
            </span>
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-4">
          {/* Work Pattern */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Work Pattern
            </h3>
            <div className="space-y-2">
              {DAY_FULL.map((dayName, i) => {
                const isOff = nonWorkingDays.includes(i);
                return (
                  <div
                    key={dayName}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">{dayName}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${isOff ? "text-gray-400" : "text-green-600"}`}
                      >
                        {isOff ? "Off" : "Working"}
                      </span>
                      <button
                        onClick={() =>
                          setNonWorkingDays((prev) =>
                            isOff ? prev.filter((x) => x !== i) : [...prev, i],
                          )
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOff ? "bg-gray-200" : "bg-indigo-600"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isOff ? "translate-x-0.5" : "translate-x-4"}`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Holidays for selected month */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Holidays — {FULL_MONTHS[selectedMonth]}
            </h3>
            {monthHolidays.length === 0 ? (
              <p className="text-xs text-gray-400">No holidays this month</p>
            ) : (
              <div className="space-y-2">
                {monthHolidays.map((h) => (
                  <div key={h.id} className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {h.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {h.date}
                        {h.recurring ? " · Recurring" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(h)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Year summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Year Summary — {year}
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Public holidays</dt>
                <dd className="font-medium text-gray-900">
                  {
                    holidays.filter((h) => h.date.startsWith(String(year)))
                      .length
                  }
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Non-working days/week</dt>
                <dd className="font-medium text-gray-900">
                  {nonWorkingDays.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Working days/week</dt>
                <dd className="font-medium text-gray-900">
                  {7 - nonWorkingDays.length}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Holiday?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}" on ${deleteTarget.date}. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeHoliday(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
