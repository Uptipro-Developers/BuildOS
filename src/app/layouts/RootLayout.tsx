import { Outlet } from "react-router";
import { Suspense } from "react";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
