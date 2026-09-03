import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { guardLazyImport } from "../utils/staleChunkReload";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { AppLayout } from "./layouts/AppLayout";

// Auth Pages
import { SignupPage } from "./pages/auth/SignupPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ActivateInvitePage } from "./pages/auth/ActivateInvitePage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// App Launcher
import { LandingPage } from "./pages/LandingPage";
import { AppLauncherPage } from "./pages/AppLauncherPage";

/**
 * Every page below loads through this rather than `lazy` directly. A page whose
 * chunk no longer exists — the tab was open across a deploy — must reload the
 * app instead of rendering React Router's error screen, and the reload can only
 * be triggered from inside the import factory. See utils/staleChunkReload.ts.
 */
const lazyPage: typeof lazy = (factory) => lazy(guardLazyImport(factory));

// Construction App (pages lazy-loaded to keep the initial bundle small)
import { ConstructionLayout } from "./pages/construction/ConstructionLayout";
import { ProjectTabsLayout } from "./pages/construction/ProjectTabsLayout";
import { ProjectSetupRoute } from "./pages/construction/ProjectSetupRoute";
const PortfolioDashboardPage = lazyPage(() => import("./pages/construction/PortfolioDashboardPage").then((m) => ({ default: m.PortfolioDashboardPage })));
const ProjectsListPage = lazyPage(() => import("./pages/construction/ProjectsListPage").then((m) => ({ default: m.ProjectsListPage })));
const ProjectOverviewPage = lazyPage(() => import("./pages/construction/ProjectOverviewPage").then((m) => ({ default: m.ProjectOverviewPage })));
const ScheduleOverviewPage = lazyPage(() => import("./pages/construction/ScheduleOverviewPage").then((m) => ({ default: m.ScheduleOverviewPage })));
const SchedulePage = lazyPage(() => import("./pages/construction/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const DailyReportsOverviewPage = lazyPage(() => import("./pages/construction/DailyReportsOverviewPage").then((m) => ({ default: m.DailyReportsOverviewPage })));
const DailyReportsPage = lazyPage(() => import("./pages/construction/DailyReportsPage").then((m) => ({ default: m.DailyReportsPage })));
const DailyReportFormPage = lazyPage(() => import("./pages/construction/DailyReportFormPage").then((m) => ({ default: m.DailyReportFormPage })));
const ResourcesOverviewPage = lazyPage(() => import("./pages/construction/ResourcesOverviewPage").then((m) => ({ default: m.ResourcesOverviewPage })));
const ProjectResourcesPage = lazyPage(() => import("./pages/construction/ProjectResourcesPage").then((m) => ({ default: m.ProjectResourcesPage })));
const ResourceDetailPage = lazyPage(() => import("./pages/construction/ResourceDetailPage").then((m) => ({ default: m.ResourceDetailPage })));
const GlobalResourceDetailPage = lazyPage(() => import("./pages/construction/GlobalResourceDetailPage").then((m) => ({ default: m.GlobalResourceDetailPage })));
const IssuesOverviewPage = lazyPage(() => import("./pages/construction/IssuesOverviewPage").then((m) => ({ default: m.IssuesOverviewPage })));
const IssuesPage = lazyPage(() => import("./pages/construction/IssuesPage").then((m) => ({ default: m.IssuesPage })));
const ChangeRequestsOverviewPage = lazyPage(() => import("./pages/construction/ChangeRequestsOverviewPage").then((m) => ({ default: m.ChangeRequestsOverviewPage })));
const ChangeRequestsPage = lazyPage(() => import("./pages/construction/ChangeRequestsPage").then((m) => ({ default: m.ChangeRequestsPage })));
const DelaysOverviewPage = lazyPage(() => import("./pages/construction/DelaysOverviewPage").then((m) => ({ default: m.DelaysOverviewPage })));
const DelaysPage = lazyPage(() => import("./pages/construction/DelaysPage").then((m) => ({ default: m.DelaysPage })));
const QualityOverviewPage = lazyPage(() => import("./pages/construction/QualityOverviewPage").then((m) => ({ default: m.QualityOverviewPage })));
const QualityPage = lazyPage(() => import("./pages/construction/QualityPage").then((m) => ({ default: m.QualityPage })));
const HSEOverviewPage = lazyPage(() => import("./pages/construction/HSEOverviewPage").then((m) => ({ default: m.HSEOverviewPage })));
const HSEPage = lazyPage(() => import("./pages/construction/HSEPage").then((m) => ({ default: m.HSEPage })));
const DocumentsOverviewPage = lazyPage(() => import("./pages/construction/DocumentsOverviewPage").then((m) => ({ default: m.DocumentsOverviewPage })));
const DocumentsPage = lazyPage(() => import("./pages/construction/DocumentsPage").then((m) => ({ default: m.DocumentsPage })));
const CostsOverviewPage = lazyPage(() => import("./pages/construction/CostsOverviewPage").then((m) => ({ default: m.CostsOverviewPage })));
// TODO(construction-port): wire project-level costs route, then re-import CostsPage
const StakeholdersOverviewPage = lazyPage(() => import("./pages/construction/StakeholdersOverviewPage").then((m) => ({ default: m.StakeholdersOverviewPage })));
const StakeholdersPage = lazyPage(() => import("./pages/construction/StakeholdersPage").then((m) => ({ default: m.StakeholdersPage })));
const ResourceHubPage = lazyPage(() => import("./pages/construction/ResourceHubPage").then((m) => ({ default: m.ResourceHubPage })));
const ResourcePlanningPage = lazyPage(() => import("./pages/construction/ResourcePlanningPage").then((m) => ({ default: m.ResourcePlanningPage })));
const ConstructionApprovalsPage = lazyPage(() => import("./pages/construction/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const ReportsPage = lazyPage(() => import("./pages/construction/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ProgressEarnedValuePage = lazyPage(() => import("./pages/construction/ProgressEarnedValuePage").then((m) => ({ default: m.ProgressEarnedValuePage })));
const SettingsPage = lazyPage(() => import("./pages/construction/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const DisbursementsPage = lazyPage(() => import("./pages/construction/DisbursementsPage").then((m) => ({ default: m.DisbursementsPage })));
const CommunicationLogPage = lazyPage(() => import("./pages/construction/CommunicationLogPage").then((m) => ({ default: m.CommunicationLogPage })));
const FundingPage = lazyPage(() => import("./pages/construction/FundingPage").then((m) => ({ default: m.FundingPage })));
const FinancialsPage = lazyPage(() => import("./pages/construction/FinancialsPage").then((m) => ({ default: m.FinancialsPage })));

// Finance App (pages lazy-loaded)
import { FinanceLayout } from "./pages/finance/FinanceLayout";
const FinanceApprovalsPage = lazyPage(() => import("./pages/finance/FinanceApprovalsPage").then((m) => ({ default: m.FinanceApprovalsPage })));
const FinanceDashboardPage = lazyPage(() => import("./pages/finance/FinanceDashboardPage").then((m) => ({ default: m.FinanceDashboardPage })));
const ChartOfAccountsPage = lazyPage(() => import("./pages/finance/ChartOfAccountsPage").then((m) => ({ default: m.ChartOfAccountsPage })));
const ExpenseManagementPage = lazyPage(() => import("./pages/finance/ExpenseManagementPage").then((m) => ({ default: m.ExpenseManagementPage })));
const IncomeManagementPage = lazyPage(() => import("./pages/finance/IncomeManagementPage").then((m) => ({ default: m.IncomeManagementPage })));
const BudgetManagementPage = lazyPage(() => import("./pages/finance/BudgetManagementPage").then((m) => ({ default: m.BudgetManagementPage })));
const PaymentManagementPage = lazyPage(() => import("./pages/finance/PaymentManagementPage").then((m) => ({ default: m.PaymentManagementPage })));
const PayrollOverviewPage = lazyPage(() => import("./pages/finance/PayrollOverviewPage").then((m) => ({ default: m.PayrollOverviewPage })));
const ClaimsManagementPage = lazyPage(() => import("./pages/finance/ClaimsManagementPage").then((m) => ({ default: m.ClaimsManagementPage })));
const TransactionsLedgerPage = lazyPage(() => import("./pages/finance/TransactionsLedgerPage").then((m) => ({ default: m.TransactionsLedgerPage })));
const FinanceReportsPage = lazyPage(() => import("./pages/finance/FinanceReportsPage").then((m) => ({ default: m.FinanceReportsPage })));
const FinanceConfigPage = lazyPage(() => import("./pages/finance/FinanceConfigPage").then((m) => ({ default: m.FinanceConfigPage })));

// Procurement App (pages lazy-loaded)
import { ProcurementLayout } from "./pages/procurement/ProcurementLayout";
const ProcurementApprovalsPage = lazyPage(() => import("./pages/procurement/ProcurementApprovalsPage").then((m) => ({ default: m.ProcurementApprovalsPage })));
const ProcurementDashboardPage = lazyPage(() => import("./pages/procurement/ProcurementDashboardPage").then((m) => ({ default: m.ProcurementDashboardPage })));
const InventoryPage = lazyPage(() => import("./pages/procurement/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const MaterialRequestsPage = lazyPage(() => import("./pages/procurement/MaterialRequestsPage").then((m) => ({ default: m.MaterialRequestsPage })));
const PurchaseRequestsPage = lazyPage(() => import("./pages/procurement/PurchaseRequestsPage").then((m) => ({ default: m.PurchaseRequestsPage })));
const SuppliersPage = lazyPage(() => import("./pages/procurement/SuppliersPage").then((m) => ({ default: m.SuppliersPage })));
const StockLevelsPage = lazyPage(() => import("./pages/procurement/StockLevelsPage").then((m) => ({ default: m.StockLevelsPage })));
const StockMovementPage = lazyPage(() => import("./pages/procurement/StockMovementPage").then((m) => ({ default: m.StockMovementPage })));
const PurchaseOrdersPage = lazyPage(() => import("./pages/procurement/PurchaseOrdersPage").then((m) => ({ default: m.PurchaseOrdersPage })));
const GoodsReceiptPage = lazyPage(() => import("./pages/procurement/GoodsReceiptPage").then((m) => ({ default: m.GoodsReceiptPage })));
const ProcurementReportsPage = lazyPage(() => import("./pages/procurement/ProcurementReportsPage").then((m) => ({ default: m.ProcurementReportsPage })));
const ProcurementConfigPage = lazyPage(() => import("./pages/procurement/ProcurementConfigPage").then((m) => ({ default: m.ProcurementConfigPage })));

// HR App (pages lazy-loaded)
import { HRLayout } from "./pages/hr/HRLayout";
const HRApprovalsPage = lazyPage(() => import("./pages/hr/HRApprovalsPage").then((m) => ({ default: m.HRApprovalsPage })));
const HRDashboardPage = lazyPage(() => import("./pages/hr/HRDashboardPage").then((m) => ({ default: m.HRDashboardPage })));
const EmployeesPage = lazyPage(() => import("./pages/hr/EmployeesPage").then((m) => ({ default: m.EmployeesPage })));
const EmployeeProfilePage = lazyPage(() => import("./pages/hr/EmployeeProfilePage").then((m) => ({ default: m.EmployeeProfilePage })));
const DepartmentsPage = lazyPage(() => import("./pages/hr/DepartmentsPage").then((m) => ({ default: m.DepartmentsPage })));
const OrgStructurePage = lazyPage(() => import("./pages/hr/OrgStructurePage").then((m) => ({ default: m.OrgStructurePage })));
const HRRolesPage = lazyPage(() => import("./pages/hr/HRRolesPage").then((m) => ({ default: m.HRRolesPage })));
const AttendancePage = lazyPage(() => import("./pages/hr/AttendancePage").then((m) => ({ default: m.AttendancePage })));
const AttendanceLogsPage = lazyPage(() => import("./pages/hr/AttendanceLogsPage").then((m) => ({ default: m.AttendanceLogsPage })));
const PayrollPage = lazyPage(() => import("./pages/hr/PayrollPage").then((m) => ({ default: m.PayrollPage })));
const SalaryStructurePage = lazyPage(() => import("./pages/hr/SalaryStructurePage").then((m) => ({ default: m.SalaryStructurePage })));
const PayrollProcessingPage = lazyPage(() => import("./pages/hr/PayrollProcessingPage").then((m) => ({ default: m.PayrollProcessingPage })));
const WorkforceAllocationPage = lazyPage(() => import("./pages/hr/WorkforceAllocationPage").then((m) => ({ default: m.WorkforceAllocationPage })));
const HRReportsPage = lazyPage(() => import("./pages/hr/HRReportsPage").then((m) => ({ default: m.HRReportsPage })));
const LeaveRequestsPage = lazyPage(() => import("./pages/hr/LeaveRequestsPage").then((m) => ({ default: m.LeaveRequestsPage })));
const LeaveBalancesPage = lazyPage(() => import("./pages/hr/LeaveBalancesPage").then((m) => ({ default: m.LeaveBalancesPage })));
const HRGeneralSetupPage = lazyPage(() => import("./pages/hr/HRGeneralSetupPage").then((m) => ({ default: m.HRGeneralSetupPage })));
const PayrollPeriodPage = lazyPage(() => import("./pages/hr/PayrollPeriodPage").then((m) => ({ default: m.PayrollPeriodPage })));
const BankNamesPage = lazyPage(() => import("./pages/hr/BankNamesPage").then((m) => ({ default: m.BankNamesPage })));
const LeaveTypeSetupPage = lazyPage(() => import("./pages/hr/LeaveTypeSetupPage").then((m) => ({ default: m.LeaveTypeSetupPage })));
const ClaimTypeSetupPage = lazyPage(() => import("./pages/hr/ClaimTypeSetupPage").then((m) => ({ default: m.ClaimTypeSetupPage })));
const BaseCalendarPage = lazyPage(() => import("./pages/hr/BaseCalendarPage").then((m) => ({ default: m.BaseCalendarPage })));
const HRSettingsPage = lazyPage(() => import("./pages/hr/HRSettingsPage").then((m) => ({ default: m.HRSettingsPage })));

// ESS App (pages lazy-loaded)
import { ESSLayout } from "./pages/ess/ESSLayout";
const ESSApprovalsPage = lazyPage(() => import("./pages/ess/ESSApprovalsPage").then((m) => ({ default: m.ESSApprovalsPage })));
const ESSDashboardPage = lazyPage(() => import("./pages/ess/ESSDashboardPage").then((m) => ({ default: m.ESSDashboardPage })));
const MyRequestsPage = lazyPage(() => import("./pages/ess/MyRequestsPage").then((m) => ({ default: m.MyRequestsPage })));
const SubmitRequestPage = lazyPage(() => import("./pages/ess/SubmitRequestPage").then((m) => ({ default: m.SubmitRequestPage })));
const MyProjectsPage = lazyPage(() => import("./pages/ess/MyProjectsPage").then((m) => ({ default: m.MyProjectsPage })));
const MyProfilePage = lazyPage(() => import("./pages/ess/MyProfilePage").then((m) => ({ default: m.MyProfilePage })));
const ActivityHistoryPage = lazyPage(() => import("./pages/ess/ActivityHistoryPage").then((m) => ({ default: m.ActivityHistoryPage })));
const MyTasksPage = lazyPage(() => import("./pages/ess/MyTasksPage").then((m) => ({ default: m.MyTasksPage })));
const PayslipHistoryPage = lazyPage(() => import("./pages/ess/PayslipHistoryPage").then((m) => ({ default: m.PayslipHistoryPage })));
const MyAttendancePage = lazyPage(() => import("./pages/ess/MyAttendancePage").then((m) => ({ default: m.MyAttendancePage })));
const AppraisalPage = lazyPage(() => import("./pages/ess/AppraisalPage").then((m) => ({ default: m.AppraisalPage })));
const LogIssuesPage = lazyPage(() => import("./pages/ess/LogIssuesPage").then((m) => ({ default: m.LogIssuesPage })));

// Admin App (pages lazy-loaded)
import { AdminLayout } from "./pages/admin/AdminLayout";
const AdminApprovalsPage = lazyPage(() => import("./pages/admin/AdminApprovalsPage").then((m) => ({ default: m.AdminApprovalsPage })));
const AdminDashboardPage = lazyPage(() => import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const UsersPage = lazyPage(() => import("./pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const RolesPage = lazyPage(() => import("./pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const UserPermissionsPage = lazyPage(() => import("./pages/admin/UserPermissionsPage").then((m) => ({ default: m.UserPermissionsPage })));
const CompanyProfilePage = lazyPage(() => import("./pages/admin/CompanyProfilePage").then((m) => ({ default: m.CompanyProfilePage })));
const BoardOfDirectorsPage = lazyPage(() => import("./pages/admin/BoardOfDirectorsPage").then((m) => ({ default: m.BoardOfDirectorsPage })));
const GeneralSettingsPage = lazyPage(() => import("./pages/admin/GeneralSettingsPage").then((m) => ({ default: m.GeneralSettingsPage })));
const UnitsOfMeasurementPage = lazyPage(() => import("./pages/admin/UnitsOfMeasurementPage").then((m) => ({ default: m.UnitsOfMeasurementPage })));
const ProjectConfigurationPage = lazyPage(() => import("./pages/admin/ProjectConfigurationPage").then((m) => ({ default: m.ProjectConfigurationPage })));
const FinancialConfigurationPage = lazyPage(() => import("./pages/admin/FinancialConfigurationPage").then((m) => ({ default: m.FinancialConfigurationPage })));
const ReportBuilderPage = lazyPage(() => import("./pages/admin/ReportBuilderPage").then((m) => ({ default: m.ReportBuilderPage })));
const NotificationsPage = lazyPage(() => import("./pages/admin/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const AuditLogsPage = lazyPage(() => import("./pages/admin/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })));
const IntegrationsPage = lazyPage(() => import("./pages/admin/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const ReportAutomationPage = lazyPage(() => import("./pages/admin/ReportAutomationPage").then((m) => ({ default: m.ReportAutomationPage })));
const EmailConfigPage = lazyPage(() => import("./pages/admin/EmailConfigPage").then((m) => ({ default: m.EmailConfigPage })));
const IssueTypesPage = lazyPage(() => import("./pages/admin/IssueTypesPage").then((m) => ({ default: m.IssueTypesPage })));
const ChangeCategoriesPage = lazyPage(() => import("./pages/admin/ChangeCategoriesPage").then((m) => ({ default: m.ChangeCategoriesPage })));
const ChangelogPage = lazyPage(() => import("./pages/admin/ChangelogPage").then((m) => ({ default: m.ChangelogPage })));

// Storefront App (pages lazy-loaded)
import { StorefrontLayout } from "./pages/storefront/StorefrontLayout";
const StorefrontDashboardPage = lazyPage(() => import("./pages/storefront/StorefrontDashboardPage").then((m) => ({ default: m.StorefrontDashboardPage })));
const AllMaterialsPage = lazyPage(() => import("./pages/storefront/AllMaterialsPage").then((m) => ({ default: m.AllMaterialsPage })));
const GeneralStorePage = lazyPage(() => import("./pages/storefront/GeneralStorePage").then((m) => ({ default: m.GeneralStorePage })));
const ProjectStoresPage = lazyPage(() => import("./pages/storefront/ProjectStoresPage").then((m) => ({ default: m.ProjectStoresPage })));
const StorefrontStockMovementPage = lazyPage(() => import("./pages/storefront/StockMovementPage").then((m) => ({ default: m.StockMovementPage })));
const IncomingRequestsPage = lazyPage(() => import("./pages/storefront/IncomingRequestsPage").then((m) => ({ default: m.IncomingRequestsPage })));
const StockTransferPage = lazyPage(() => import("./pages/storefront/StockTransferPage").then((m) => ({ default: m.StockTransferPage })));
const MaterialReturnsPage = lazyPage(() => import("./pages/storefront/MaterialReturnsPage").then((m) => ({ default: m.MaterialReturnsPage })));
const StorefrontApprovalsPage = lazyPage(() => import("./pages/storefront/StorefrontApprovalsPage").then((m) => ({ default: m.StorefrontApprovalsPage })));
const StorefrontReportsPage = lazyPage(() => import("./pages/storefront/StorefrontReportsPage").then((m) => ({ default: m.StorefrontReportsPage })));
const StorefrontTasksPage = lazyPage(() => import("./pages/storefront/StorefrontTasksPage").then((m) => ({ default: m.StorefrontTasksPage })));
const StorefrontMyTasksPage = lazyPage(() => import("./pages/storefront/StorefrontMyTasksPage").then((m) => ({ default: m.StorefrontMyTasksPage })));
const StorefrontConfigPage = lazyPage(() => import("./pages/storefront/StorefrontConfigPage").then((m) => ({ default: m.StorefrontConfigPage })));

// Finance new pages (lazy-loaded)
const JournalEntryPage = lazyPage(() => import("./pages/finance/JournalEntryPage").then((m) => ({ default: m.JournalEntryPage })));
const BudgetTrackingPage = lazyPage(() => import("./pages/finance/BudgetTrackingPage").then((m) => ({ default: m.BudgetTrackingPage })));
const ExpensesPage = lazyPage(() => import("./pages/finance/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const ScheduledPostingPage = lazyPage(() => import("./pages/finance/ScheduledPostingPage").then((m) => ({ default: m.ScheduledPostingPage })));
const TransactionsPage = lazyPage(() => import("./pages/finance/TransactionsPage").then((m) => ({ default: m.TransactionsPage })));
const FinanceTasksPage = lazyPage(() => import("./pages/finance/FinanceTasksPage").then((m) => ({ default: m.FinanceTasksPage })));
const FinanceMyTasksPage = lazyPage(() => import("./pages/finance/FinanceMyTasksPage").then((m) => ({ default: m.FinanceMyTasksPage })));
const ProcessMappingPage = lazyPage(() => import("./pages/finance/ProcessMappingPage").then((m) => ({ default: m.ProcessMappingPage })));
const AccrualsPage = lazyPage(() => import("./pages/finance/AccrualsPage").then((m) => ({ default: m.AccrualsPage })));
const YearEndClosePage = lazyPage(() => import("./pages/finance/YearEndClosePage").then((m) => ({ default: m.YearEndClosePage })));
const FiscalYearsPage = lazyPage(() => import("./pages/finance/FiscalYearsPage").then((m) => ({ default: m.FiscalYearsPage })));

// HR new pages (lazy-loaded)
const HRTasksPage = lazyPage(() => import("./pages/hr/HRTasksPage").then((m) => ({ default: m.HRTasksPage })));
const HRMyTasksPage = lazyPage(() => import("./pages/hr/HRMyTasksPage").then((m) => ({ default: m.HRMyTasksPage })));

// Procurement new pages (lazy-loaded)
const GeneralLedgerPage = lazyPage(() => import("./pages/finance/GeneralLedgerPage").then((m) => ({ default: m.GeneralLedgerPage })));
const PurchaseInvoicePage = lazyPage(() => import("./pages/procurement/PurchaseInvoicePage").then((m) => ({ default: m.PurchaseInvoicePage })));
const ProcurementTasksPage = lazyPage(() => import("./pages/procurement/ProcurementTasksPage").then((m) => ({ default: m.ProcurementTasksPage })));
const ProcurementMyTasksPage = lazyPage(() => import("./pages/procurement/ProcurementMyTasksPage").then((m) => ({ default: m.ProcurementMyTasksPage })));
const SentRequestsPage = lazyPage(() => import("./pages/procurement/SentRequestsPage").then((m) => ({ default: m.SentRequestsPage })));
const ReceivedQuotesPage = lazyPage(() => import("./pages/procurement/ReceivedQuotesPage").then((m) => ({ default: m.ReceivedQuotesPage })));
const SupplierCompliancePage = lazyPage(() => import("./pages/procurement/SupplierCompliancePage").then((m) => ({ default: m.SupplierCompliancePage })));

// Construction my-tasks
// TODO(construction-port): wire construction my-tasks route, then re-import
// import { ConstructionMyTasksPage } from "./pages/construction/ConstructionMyTasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    // Rendered while lazy route modules load on initial hydration.
    HydrateFallback: () => null,
    children: [
      {
        path: "auth",
        Component: AuthLayout,
        children: [
          { path: "signup", Component: SignupPage },
          { path: "login", Component: LoginPage },
          { path: "verify", Component: VerifyEmailPage },
          { path: "activate", Component: ActivateInvitePage },
          { path: "reset-password", Component: ResetPasswordPage },
        ],
      },
      {
        path: "apps",
        Component: AppLayout,
        children: [
          { index: true, Component: AppLauncherPage },
          {
            path: "construction",
            Component: ConstructionLayout,
            children: [
              { index: true, Component: PortfolioDashboardPage },
              { path: "dashboard", Component: PortfolioDashboardPage },
              { path: "projects", Component: ProjectsListPage },
              { path: "schedule", Component: ScheduleOverviewPage },
              {
                path: "tasks",
                lazy: () =>
                  import("./pages/construction/TasksPage").then((m) => ({
                    Component: m.TasksPage,
                  })),
              },
              {
                path: "my-tasks",
                lazy: () =>
                  import("./pages/construction/MyTasksPage").then((m) => ({
                    Component: m.MyTasksPage,
                  })),
              },
              { path: "daily-reports", Component: DailyReportsOverviewPage },
              { path: "resources", Component: ResourcesOverviewPage },
              {
                path: "resources/:resourceId",
                Component: GlobalResourceDetailPage,
              },
              { path: "issues", Component: IssuesOverviewPage },
              {
                path: "change-requests",
                Component: ChangeRequestsOverviewPage,
              },
              { path: "delays", Component: DelaysOverviewPage },
              { path: "quality", Component: QualityOverviewPage },
              { path: "hse", Component: HSEOverviewPage },
              { path: "documents", Component: DocumentsOverviewPage },
              { path: "costs", Component: CostsOverviewPage },
              {
                path: "finance",
                lazy: () =>
                  import("./pages/construction/FinancePage").then((m) => ({
                    Component: m.FinancePage,
                  })),
              },
              { path: "funding", Component: FundingPage },
              { path: "stakeholders", Component: StakeholdersOverviewPage },
              { path: "reports", Component: ReportsPage },
              { path: "resource-hub", Component: ResourceHubPage },
              { path: "resource-planning", Component: ResourcePlanningPage },
              { path: "approvals", Component: ConstructionApprovalsPage },
              { path: "settings", Component: SettingsPage },
              { path: "disbursements", Component: DisbursementsPage },
              { path: "communications", Component: CommunicationLogPage },
              {
                path: "projects/:id",
                Component: ProjectTabsLayout,
                children: [
                  { index: true, Component: ProjectOverviewPage },
                  { path: "overview", Component: ProjectOverviewPage },
                  { path: "schedule", Component: SchedulePage },
                  { path: "daily-reports", Component: DailyReportsPage },
                  { path: "daily-reports/new", Component: DailyReportFormPage },
                  {
                    path: "daily-reports/:reportId",
                    Component: DailyReportFormPage,
                  },
                  { path: "resources", Component: ProjectResourcesPage },
                  {
                    path: "resources/:resourceId",
                    Component: ResourceDetailPage,
                  },
                  { path: "issues", Component: IssuesPage },
                  { path: "change-requests", Component: ChangeRequestsPage },
                  { path: "delays", Component: DelaysPage },
                  { path: "quality", Component: QualityPage },
                  { path: "hse", Component: HSEPage },
                  { path: "documents", Component: DocumentsPage },
                  { path: "financials", Component: FinancialsPage },
                  { path: "stakeholders", Component: StakeholdersPage },
                  { path: "progress", Component: ProgressEarnedValuePage },
                  { path: "setup", Component: ProjectSetupRoute },
                ],
              },
            ],
          },
          {
            path: "finance",
            Component: FinanceLayout,
            children: [
              { index: true, Component: FinanceDashboardPage },
              { path: "dashboard", Component: FinanceDashboardPage },
              { path: "chart-of-accounts", Component: ChartOfAccountsPage },
              { path: "journal", Component: JournalEntryPage },
              { path: "accruals", Component: AccrualsPage },
              { path: "expenses", Component: ExpenseManagementPage },
              { path: "income", Component: IncomeManagementPage },
              { path: "budget", Component: BudgetManagementPage },
              { path: "payments", Component: PaymentManagementPage },
              { path: "payroll", Component: PayrollOverviewPage },
              { path: "claims", Component: ClaimsManagementPage },
              { path: "approvals", Component: FinanceApprovalsPage },
              { path: "general-ledger", Component: GeneralLedgerPage },
              { path: "ledger", Component: TransactionsLedgerPage },
              { path: "reports", Component: FinanceReportsPage },
              { path: "config", Component: FinanceConfigPage },
              { path: "tasks", Component: FinanceTasksPage },
              { path: "my-tasks", Component: FinanceMyTasksPage },
              { path: "process-mapping", Component: ProcessMappingPage },
              { path: "purchase-invoice", Component: PurchaseInvoicePage },
              { path: "budget-tracking", Component: BudgetTrackingPage },
              { path: "expenses-list", Component: ExpensesPage },
              { path: "scheduled-posting", Component: ScheduledPostingPage },
              { path: "transactions", Component: TransactionsPage },
              { path: "year-end-close", Component: YearEndClosePage },
              { path: "fiscal-years", Component: FiscalYearsPage },
            ],
          },
          {
            path: "procurement",
            Component: ProcurementLayout,
            children: [
              // Every module lands on its dashboard; Procurement previously
              // opened the Inventory list instead.
              { index: true, Component: ProcurementDashboardPage },
              { path: "dashboard", Component: ProcurementDashboardPage },
              { path: "inventory", Component: InventoryPage },
              { path: "stock-levels", Component: StockLevelsPage },
              { path: "stock-movement", Component: StockMovementPage },
              { path: "material-requests", Component: MaterialRequestsPage },
              { path: "purchase-requests", Component: PurchaseRequestsPage },
              { path: "purchase-orders", Component: PurchaseOrdersPage },
              { path: "goods-receipt", Component: GoodsReceiptPage },
              { path: "suppliers", Component: SuppliersPage },
              { path: "approvals", Component: ProcurementApprovalsPage },
              { path: "reports", Component: ProcurementReportsPage },
              { path: "tasks", Component: ProcurementTasksPage },
              { path: "my-tasks", Component: ProcurementMyTasksPage },
              { path: "sent-requests", Component: SentRequestsPage },
              { path: "received-quotes", Component: ReceivedQuotesPage },
              {
                path: "supplier-compliance",
                Component: SupplierCompliancePage,
              },
              { path: "config", Component: ProcurementConfigPage },
            ],
          },
          {
            path: "hr",
            Component: HRLayout,
            children: [
              { index: true, Component: HRDashboardPage },
              { path: "dashboard", Component: HRDashboardPage },
              { path: "employees", Component: EmployeesPage },
              { path: "employees/:id", Component: EmployeeProfilePage },
              { path: "departments", Component: DepartmentsPage },
              { path: "org-structure", Component: OrgStructurePage },
              { path: "hr-roles", Component: HRRolesPage },
              { path: "attendance", Component: AttendancePage },
              { path: "attendance-logs", Component: AttendanceLogsPage },
              { path: "payroll", Component: PayrollPage },
              { path: "salary-structure", Component: SalaryStructurePage },
              { path: "payroll-processing", Component: PayrollProcessingPage },
              { path: "workforce", Component: WorkforceAllocationPage },
              { path: "reports", Component: HRReportsPage },
              { path: "leave-requests", Component: LeaveRequestsPage },
              { path: "leave-balances", Component: LeaveBalancesPage },
              { path: "hr-general-setup", Component: HRGeneralSetupPage },
              { path: "payroll-periods", Component: PayrollPeriodPage },
              { path: "bank-names", Component: BankNamesPage },
              { path: "leave-type-setup", Component: LeaveTypeSetupPage },
              { path: "claim-type-setup", Component: ClaimTypeSetupPage },
              { path: "base-calendar", Component: BaseCalendarPage },
              { path: "settings", Component: HRSettingsPage },
              { path: "approvals", Component: HRApprovalsPage },
              { path: "hr-tasks", Component: HRTasksPage },
              { path: "my-tasks", Component: HRMyTasksPage },
            ],
          },
          {
            path: "ess",
            Component: ESSLayout,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: "dashboard", Component: ESSDashboardPage },
              { path: "requests", Component: MyRequestsPage },
              { path: "submit", Component: SubmitRequestPage },
              { path: "projects", Component: MyProjectsPage },
              { path: "profile", Component: MyProfilePage },
              { path: "activity", Component: ActivityHistoryPage },
              { path: "tasks", Component: MyTasksPage },
              { path: "approvals", Component: ESSApprovalsPage },
              { path: "payslips", Component: PayslipHistoryPage },
              { path: "attendance", Component: MyAttendancePage },
              { path: "appraisals", Component: AppraisalPage },
              { path: "log-issues", Component: LogIssuesPage },
            ],
          },
          {
            path: "admin",
            Component: AdminLayout,
            children: [
              { index: true, Component: AdminDashboardPage },
              { path: "dashboard", Component: AdminDashboardPage },
              { path: "users", Component: UsersPage },
              { path: "roles", Component: RolesPage },
              { path: "user-permissions", Component: UserPermissionsPage },
              { path: "company-profile", Component: CompanyProfilePage },
              { path: "board-of-directors", Component: BoardOfDirectorsPage },
              { path: "general-settings", Component: GeneralSettingsPage },
              { path: "units", Component: UnitsOfMeasurementPage },
              { path: "project-config", Component: ProjectConfigurationPage },
              { path: "report-builder", Component: ReportBuilderPage },
              { path: "report-automation", Component: ReportAutomationPage },
              { path: "notifications", Component: NotificationsPage },
              { path: "audit-logs", Component: AuditLogsPage },
              { path: "integrations", Component: IntegrationsPage },
              { path: "approvals", Component: AdminApprovalsPage },
              { path: "email-config", Component: EmailConfigPage },
              { path: "issue-types", Component: IssueTypesPage },
              { path: "change-categories", Component: ChangeCategoriesPage },
              {
                path: "financial-config",
                Component: FinancialConfigurationPage,
              },
              { path: "changelog", Component: ChangelogPage },
            ],
          },
          {
            path: "storefront",
            Component: StorefrontLayout,
            children: [
              { index: true, Component: StorefrontDashboardPage },
              { path: "dashboard", Component: StorefrontDashboardPage },
              { path: "all-materials", Component: AllMaterialsPage },
              { path: "general-store", Component: GeneralStorePage },
              { path: "project-stores", Component: ProjectStoresPage },
              {
                path: "stock-movement",
                Component: StorefrontStockMovementPage,
              },
              { path: "incoming-requests", Component: IncomingRequestsPage },
              { path: "stock-transfers", Component: StockTransferPage },
              { path: "returns", Component: MaterialReturnsPage },
              { path: "approvals", Component: StorefrontApprovalsPage },
              { path: "reports", Component: StorefrontReportsPage },
              { path: "tasks", Component: StorefrontTasksPage },
              { path: "my-tasks", Component: StorefrontMyTasksPage },
              { path: "config", Component: StorefrontConfigPage },
            ],
          },
        ],
      },
      { index: true, Component: LandingPage },
    ],
  },
]);
