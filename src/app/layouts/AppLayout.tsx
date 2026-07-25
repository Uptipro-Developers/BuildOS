import { Outlet } from "react-router";
import { HRConfigProvider } from "../stores/hrConfigStore";
import { ResourceProvider } from "../contexts/ResourceContext";
import { TaskProvider } from "../contexts/TaskContext";
import { RolesProvider } from "../contexts/RolesContext";
import { ChangelogProvider } from "../stores/changelogStore";
import { NumberingProvider } from "../stores/numberingStore";
import { ProjectTypeProvider } from "../stores/projectTypeStore";
import { EmployeeProvider } from "../stores/employeeStore";
import { UserProvider } from "../stores/userStore";

export function AppLayout() {
  return (
    <ChangelogProvider>
      <HRConfigProvider>
        <ResourceProvider>
          <TaskProvider>
            <RolesProvider>
              <NumberingProvider>
                <ProjectTypeProvider>
                  <EmployeeProvider>
                    <UserProvider>
                      <div className="min-h-screen bg-gray-50">
                        <Outlet />
                      </div>
                    </UserProvider>
                  </EmployeeProvider>
                </ProjectTypeProvider>
              </NumberingProvider>
            </RolesProvider>
          </TaskProvider>
        </ResourceProvider>
      </HRConfigProvider>
    </ChangelogProvider>
  );
}
