import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
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
import { AppLauncherPage } from "./pages/AppLauncherPage";

// Construction App (pages lazy-loaded to keep the initial bundle small)
import { ConstructionLayout } from "./pages/construction/ConstructionLayout";
import { ProjectTabsLayout } from "./pages/construction/ProjectTabsLayout";
import { ProjectSetupRoute } from "./pages/construction/ProjectSetupRoute";
const PortfolioDashboardPage = lazy(() => import("./pages/construction/PortfolioDashboardPage").then((m) => ({ default: m.PortfolioDashboardPage })));
const ProjectsListPage = lazy(() => import("./pages/construction/ProjectsListPage").then((m) => ({ default: m.ProjectsListPage })));
const ProjectOverviewPage = lazy(() => import("./pages/construction/ProjectOverviewPage").then((m) => ({ default: m.ProjectOverviewPage })));
const ScheduleOverviewPage = lazy(() => import("./pages/construction/ScheduleOverviewPage").then((m) => ({ default: m.ScheduleOverviewPage })));
const SchedulePage = lazy(() => import("./pages/construction/SchedulePage").then((m) => ({ default: m.SchedulePage })));
const DailyReportsOverviewPage = lazy(() => import("./pages/construction/DailyReportsOverviewPage").then((m) => ({ default: m.DailyReportsOverviewPage })));
const DailyReportsPage = lazy(() => import("./pages/construction/DailyReportsPage").then((m) => ({ default: m.DailyReportsPage })));
const DailyReportFormPage = lazy(() => import("./pages/construction/DailyReportFormPage").then((m) => ({ default: m.DailyReportFormPage })));
const ResourcesOverviewPage = lazy(() => import("./pages/construction/ResourcesOverviewPage").then((m) => ({ default: m.ResourcesOverviewPage })));
const ProjectResourcesPage = lazy(() => import("./pages/construction/ProjectResourcesPage").then((m) => ({ default: m.ProjectResourcesPage })));
const ResourceDetailPage = lazy(() => import("./pages/construction/ResourceDetailPage").then((m) => ({ default: m.ResourceDetailPage })));
const GlobalResourceDetailPage = lazy(() => import("./pages/construction/GlobalResourceDetailPage").then((m) => ({ default: m.GlobalResourceDetailPage })));
const IssuesOverviewPage = lazy(() => import("./pages/construction/IssuesOverviewPage").then((m) => ({ default: m.IssuesOverviewPage })));
const IssuesPage = lazy(() => import("./pages/construction/IssuesPage").then((m) => ({ default: m.IssuesPage })));
const ChangeRequestsOverviewPage = lazy(() => import("./pages/construction/ChangeRequestsOverviewPage").then((m) => ({ default: m.ChangeRequestsOverviewPage })));
const ChangeRequestsPage = lazy(() => import("./pages/construction/ChangeRequestsPage").then((m) => ({ default: m.ChangeRequestsPage })));
const DelaysOverviewPage = lazy(() => import("./pages/construction/DelaysOverviewPage").then((m) => ({ default: m.DelaysOverviewPage })));
const DelaysPage = lazy(() => import("./pages/construction/DelaysPage").then((m) => ({ default: m.DelaysPage })));
const QualityOverviewPage = lazy(() => import("./pages/construction/QualityOverviewPage").then((m) => ({ default: m.QualityOverviewPage })));
const QualityPage = lazy(() => import("./pages/construction/QualityPage").then((m) => ({ default: m.QualityPage })));
const HSEOverviewPage = lazy(() => import("./pages/construction/HSEOverviewPage").then((m) => ({ default: m.HSEOverviewPage })));
const HSEPage = lazy(() => import("./pages/construction/HSEPage").then((m) => ({ default: m.HSEPage })));
const DocumentsOverviewPage = lazy(() => import("./pages/construction/DocumentsOverviewPage").then((m) => ({ default: m.DocumentsOverviewPage })));
const DocumentsPage = lazy(() => import("./pages/construction/DocumentsPage").then((m) => ({ default: m.DocumentsPage })));
const CostsOverviewPage = lazy(() => import("./pages/construction/CostsOverviewPage").then((m) => ({ default: m.CostsOverviewPage })));
// TODO(construction-port): wire project-level costs route, then re-import CostsPage
const StakeholdersOverviewPage = lazy(() => import("./pages/construction/StakeholdersOverviewPage").then((m) => ({ default: m.StakeholdersOverviewPage })));
const StakeholdersPage = lazy(() => import("./pages/construction/StakeholdersPage").then((m) => ({ default: m.StakeholdersPage })));
const ResourceHubPage = lazy(() => import("./pages/construction/ResourceHubPage").then((m) => ({ default: m.ResourceHubPage })));
const ResourcePlanningPage = lazy(() => import("./pages/construction/ResourcePlanningPage").then((m) => ({ default: m.ResourcePlanningPage })));
const ConstructionApprovalsPage = lazy(() => import("./pages/construction/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const ReportsPage = lazy(() => import("./pages/construction/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ProgressEarnedValuePage = lazy(() => import("./pages/construction/ProgressEarnedValuePage").then((m) => ({ default: m.ProgressEarnedValuePage })));
const SettingsPage = lazy(() => import("./pages/construction/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const DisbursementsPage = lazy(() => import("./pages/construction/DisbursementsPage").then((m) => ({ default: m.DisbursementsPage })));
const CommunicationLogPage = lazy(() => import("./pages/construction/CommunicationLogPage").then((m) => ({ default: m.CommunicationLogPage })));
const FundingPage = lazy(() => import("./pages/construction/FundingPage").then((m) => ({ default: m.FundingPage })));
const FinancialsPage = lazy(() => import("./pages/construction/FinancialsPage").then((m) => ({ default: m.FinancialsPage })));

// Finance App (pages lazy-loaded)
import { FinanceLayout } from "./pages/finance/FinanceLayout";
const FinanceApprovalsPage = lazy(() => import("./pages/finance/FinanceApprovalsPage").then((m) => ({ default: m.FinanceApprovalsPage })));
const FinanceDashboardPage = lazy(() => import("./pages/finance/FinanceDashboardPage").then((m) => ({ default: m.FinanceDashboardPage })));
const ChartOfAccountsPage = lazy(() => import("./pages/finance/ChartOfAccountsPage").then((m) => ({ default: m.ChartOfAccountsPage })));
const ExpenseManagementPage = lazy(() => import("./pages/finance/ExpenseManagementPage").then((m) => ({ default: m.ExpenseManagementPage })));
const IncomeManagementPage = lazy(() => import("./pages/finance/IncomeManagementPage").then((m) => ({ default: m.IncomeManagementPage })));
const BudgetManagementPage = lazy(() => import("./pages/finance/BudgetManagementPage").then((m) => ({ default: m.BudgetManagementPage })));
const PaymentManagementPage = lazy(() => import("./pages/finance/PaymentManagementPage").then((m) => ({ default: m.PaymentManagementPage })));
const PayrollIntegrationPage = lazy(() => import("./pages/finance/PayrollIntegrationPage").then((m) => ({ default: m.PayrollIntegrationPage })));
const ClaimsManagementPage = lazy(() => import("./pages/finance/ClaimsManagementPage").then((m) => ({ default: m.ClaimsManagementPage })));
const TransactionsLedgerPage = lazy(() => import("./pages/finance/TransactionsLedgerPage").then((m) => ({ default: m.TransactionsLedgerPage })));
const FinanceReportsPage = lazy(() => import("./pages/finance/FinanceReportsPage").then((m) => ({ default: m.FinanceReportsPage })));
const FinanceConfigPage = lazy(() => import("./pages/finance/FinanceConfigPage").then((m) => ({ default: m.FinanceConfigPage })));

// Procurement App (pages lazy-loaded)
import { ProcurementLayout } from "./pages/procurement/ProcurementLayout";
const ProcurementApprovalsPage = lazy(() => import("./pages/procurement/ProcurementApprovalsPage").then((m) => ({ default: m.ProcurementApprovalsPage })));
const ProcurementDashboardPage = lazy(() => import("./pages/procurement/ProcurementDashboardPage").then((m) => ({ default: m.ProcurementDashboardPage })));
const InventoryPage = lazy(() => import("./pages/procurement/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const MaterialRequestsPage = lazy(() => import("./pages/procurement/MaterialRequestsPage").then((m) => ({ default: m.MaterialRequestsPage })));
const PurchaseRequestsPage = lazy(() => import("./pages/procurement/PurchaseRequestsPage").then((m) => ({ default: m.PurchaseRequestsPage })));
const SuppliersPage = lazy(() => import("./pages/procurement/SuppliersPage").then((m) => ({ default: m.SuppliersPage })));
const StockLevelsPage = lazy(() => import("./pages/procurement/StockLevelsPage").then((m) => ({ default: m.StockLevelsPage })));
const StockMovementPage = lazy(() => import("./pages/procurement/StockMovementPage").then((m) => ({ default: m.StockMovementPage })));
const PurchaseOrdersPage = lazy(() => import("./pages/procurement/PurchaseOrdersPage").then((m) => ({ default: m.PurchaseOrdersPage })));
const GoodsReceiptPage = lazy(() => import("./pages/procurement/GoodsReceiptPage").then((m) => ({ default: m.GoodsReceiptPage })));
const ProcurementReportsPage = lazy(() => import("./pages/procurement/ProcurementReportsPage").then((m) => ({ default: m.ProcurementReportsPage })));
const ProcurementConfigPage = lazy(() => import("./pages/procurement/ProcurementConfigPage").then((m) => ({ default: m.ProcurementConfigPage })));

// HR App (pages lazy-loaded)
import { HRLayout } from "./pages/hr/HRLayout";
const HRApprovalsPage = lazy(() => import("./pages/hr/HRApprovalsPage").then((m) => ({ default: m.HRApprovalsPage })));
const HRDashboardPage = lazy(() => import("./pages/hr/HRDashboardPage").then((m) => ({ default: m.HRDashboardPage })));
const EmployeesPage = lazy(() => import("./pages/hr/EmployeesPage").then((m) => ({ default: m.EmployeesPage })));
const EmployeeProfilePage = lazy(() => import("./pages/hr/EmployeeProfilePage").then((m) => ({ default: m.EmployeeProfilePage })));
const DepartmentsPage = lazy(() => import("./pages/hr/DepartmentsPage").then((m) => ({ default: m.DepartmentsPage })));
const OrgStructurePage = lazy(() => import("./pages/hr/OrgStructurePage").then((m) => ({ default: m.OrgStructurePage })));
const HRRolesPage = lazy(() => import("./pages/hr/HRRolesPage").then((m) => ({ default: m.HRRolesPage })));
const AttendancePage = lazy(() => import("./pages/hr/AttendancePage").then((m) => ({ default: m.AttendancePage })));
const AttendanceLogsPage = lazy(() => import("./pages/hr/AttendanceLogsPage").then((m) => ({ default: m.AttendanceLogsPage })));
const PayrollPage = lazy(() => import("./pages/hr/PayrollPage").then((m) => ({ default: m.PayrollPage })));
const SalaryStructurePage = lazy(() => import("./pages/hr/SalaryStructurePage").then((m) => ({ default: m.SalaryStructurePage })));
const PayrollProcessingPage = lazy(() => import("./pages/hr/PayrollProcessingPage").then((m) => ({ default: m.PayrollProcessingPage })));
const WorkforceAllocationPage = lazy(() => import("./pages/hr/WorkforceAllocationPage").then((m) => ({ default: m.WorkforceAllocationPage })));
const HRReportsPage = lazy(() => import("./pages/hr/HRReportsPage").then((m) => ({ default: m.HRReportsPage })));
const LeaveRequestsPage = lazy(() => import("./pages/hr/LeaveRequestsPage").then((m) => ({ default: m.LeaveRequestsPage })));
const LeaveBalancesPage = lazy(() => import("./pages/hr/LeaveBalancesPage").then((m) => ({ default: m.LeaveBalancesPage })));
const HRGeneralSetupPage = lazy(() => import("./pages/hr/HRGeneralSetupPage").then((m) => ({ default: m.HRGeneralSetupPage })));
const PayrollPeriodPage = lazy(() => import("./pages/hr/PayrollPeriodPage").then((m) => ({ default: m.PayrollPeriodPage })));
const BankNamesPage = lazy(() => import("./pages/hr/BankNamesPage").then((m) => ({ default: m.BankNamesPage })));
const LeaveTypeSetupPage = lazy(() => import("./pages/hr/LeaveTypeSetupPage").then((m) => ({ default: m.LeaveTypeSetupPage })));
const ClaimTypeSetupPage = lazy(() => import("./pages/hr/ClaimTypeSetupPage").then((m) => ({ default: m.ClaimTypeSetupPage })));
const BaseCalendarPage = lazy(() => import("./pages/hr/BaseCalendarPage").then((m) => ({ default: m.BaseCalendarPage })));

// ESS App (pages lazy-loaded)
import { ESSLayout } from "./pages/ess/ESSLayout";
const ESSApprovalsPage = lazy(() => import("./pages/ess/ESSApprovalsPage").then((m) => ({ default: m.ESSApprovalsPage })));
const ESSDashboardPage = lazy(() => import("./pages/ess/ESSDashboardPage").then((m) => ({ default: m.ESSDashboardPage })));
const MyRequestsPage = lazy(() => import("./pages/ess/MyRequestsPage").then((m) => ({ default: m.MyRequestsPage })));
const SubmitRequestPage = lazy(() => import("./pages/ess/SubmitRequestPage").then((m) => ({ default: m.SubmitRequestPage })));
const MyProjectsPage = lazy(() => import("./pages/ess/MyProjectsPage").then((m) => ({ default: m.MyProjectsPage })));
const MyProfilePage = lazy(() => import("./pages/ess/MyProfilePage").then((m) => ({ default: m.MyProfilePage })));
const ActivityHistoryPage = lazy(() => import("./pages/ess/ActivityHistoryPage").then((m) => ({ default: m.ActivityHistoryPage })));
const MyTasksPage = lazy(() => import("./pages/ess/MyTasksPage").then((m) => ({ default: m.MyTasksPage })));
const PayslipHistoryPage = lazy(() => import("./pages/ess/PayslipHistoryPage").then((m) => ({ default: m.PayslipHistoryPage })));
const AppraisalPage = lazy(() => import("./pages/ess/AppraisalPage").then((m) => ({ default: m.AppraisalPage })));
const LogIssuesPage = lazy(() => import("./pages/ess/LogIssuesPage").then((m) => ({ default: m.LogIssuesPage })));

// Admin App (pages lazy-loaded)
import { AdminLayout } from "./pages/admin/AdminLayout";
const AdminApprovalsPage = lazy(() => import("./pages/admin/AdminApprovalsPage").then((m) => ({ default: m.AdminApprovalsPage })));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const UsersPage = lazy(() => import("./pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import("./pages/admin/RolesPage").then((m) => ({ default: m.RolesPage })));
const UserPermissionsPage = lazy(() => import("./pages/admin/UserPermissionsPage").then((m) => ({ default: m.UserPermissionsPage })));
const CompanyProfilePage = lazy(() => import("./pages/admin/CompanyProfilePage").then((m) => ({ default: m.CompanyProfilePage })));
const BoardOfDirectorsPage = lazy(() => import("./pages/admin/BoardOfDirectorsPage").then((m) => ({ default: m.BoardOfDirectorsPage })));
const GeneralSettingsPage = lazy(() => import("./pages/admin/GeneralSettingsPage").then((m) => ({ default: m.GeneralSettingsPage })));
const UnitsOfMeasurementPage = lazy(() => import("./pages/admin/UnitsOfMeasurementPage").then((m) => ({ default: m.UnitsOfMeasurementPage })));
const ProjectConfigurationPage = lazy(() => import("./pages/admin/ProjectConfigurationPage").then((m) => ({ default: m.ProjectConfigurationPage })));
const FinancialConfigurationPage = lazy(() => import("./pages/admin/FinancialConfigurationPage").then((m) => ({ default: m.FinancialConfigurationPage })));
const ReportBuilderPage = lazy(() => import("./pages/admin/ReportBuilderPage").then((m) => ({ default: m.ReportBuilderPage })));
const NotificationsPage = lazy(() => import("./pages/admin/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const AuditLogsPage = lazy(() => import("./pages/admin/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage })));
const IntegrationsPage = lazy(() => import("./pages/admin/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const ReportAutomationPage = lazy(() => import("./pages/admin/ReportAutomationPage").then((m) => ({ default: m.ReportAutomationPage })));
const EmailConfigPage = lazy(() => import("./pages/admin/EmailConfigPage").then((m) => ({ default: m.EmailConfigPage })));
const IssueTypesPage = lazy(() => import("./pages/admin/IssueTypesPage").then((m) => ({ default: m.IssueTypesPage })));
const ChangeCategoriesPage = lazy(() => import("./pages/admin/ChangeCategoriesPage").then((m) => ({ default: m.ChangeCategoriesPage })));
const ChangelogPage = lazy(() => import("./pages/admin/ChangelogPage").then((m) => ({ default: m.ChangelogPage })));

// Storefront App (pages lazy-loaded)
import { StorefrontLayout } from "./pages/storefront/StorefrontLayout";
const StorefrontDashboardPage = lazy(() => import("./pages/storefront/StorefrontDashboardPage").then((m) => ({ default: m.StorefrontDashboardPage })));
const AllMaterialsPage = lazy(() => import("./pages/storefront/AllMaterialsPage").then((m) => ({ default: m.AllMaterialsPage })));
const GeneralStorePage = lazy(() => import("./pages/storefront/GeneralStorePage").then((m) => ({ default: m.GeneralStorePage })));
const ProjectStoresPage = lazy(() => import("./pages/storefront/ProjectStoresPage").then((m) => ({ default: m.ProjectStoresPage })));
const StorefrontStockMovementPage = lazy(() => import("./pages/storefront/StockMovementPage").then((m) => ({ default: m.StockMovementPage })));
const IncomingRequestsPage = lazy(() => import("./pages/storefront/IncomingRequestsPage").then((m) => ({ default: m.IncomingRequestsPage })));
const StockTransferPage = lazy(() => import("./pages/storefront/StockTransferPage").then((m) => ({ default: m.StockTransferPage })));
const MaterialReturnsPage = lazy(() => import("./pages/storefront/MaterialReturnsPage").then((m) => ({ default: m.MaterialReturnsPage })));
const StorefrontApprovalsPage = lazy(() => import("./pages/storefront/StorefrontApprovalsPage").then((m) => ({ default: m.StorefrontApprovalsPage })));
const StorefrontReportsPage = lazy(() => import("./pages/storefront/StorefrontReportsPage").then((m) => ({ default: m.StorefrontReportsPage })));
const StorefrontTasksPage = lazy(() => import("./pages/storefront/StorefrontTasksPage").then((m) => ({ default: m.StorefrontTasksPage })));
const StorefrontMyTasksPage = lazy(() => import("./pages/storefront/StorefrontMyTasksPage").then((m) => ({ default: m.StorefrontMyTasksPage })));
const StorefrontConfigPage = lazy(() => import("./pages/storefront/StorefrontConfigPage").then((m) => ({ default: m.StorefrontConfigPage })));

// Finance new pages (lazy-loaded)
const JournalEntryPage = lazy(() => import("./pages/finance/JournalEntryPage").then((m) => ({ default: m.JournalEntryPage })));
const BudgetTrackingPage = lazy(() => import("./pages/finance/BudgetTrackingPage").then((m) => ({ default: m.BudgetTrackingPage })));
const ExpensesPage = lazy(() => import("./pages/finance/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const ScheduledPostingPage = lazy(() => import("./pages/finance/ScheduledPostingPage").then((m) => ({ default: m.ScheduledPostingPage })));
const TransactionsPage = lazy(() => import("./pages/finance/TransactionsPage").then((m) => ({ default: m.TransactionsPage })));
const FinanceTasksPage = lazy(() => import("./pages/finance/FinanceTasksPage").then((m) => ({ default: m.FinanceTasksPage })));
const FinanceMyTasksPage = lazy(() => import("./pages/finance/FinanceMyTasksPage").then((m) => ({ default: m.FinanceMyTasksPage })));
const ProcessMappingPage = lazy(() => import("./pages/finance/ProcessMappingPage").then((m) => ({ default: m.ProcessMappingPage })));
const PostingEnginePage = lazy(() => import("./pages/finance/PostingEnginePage").then((m) => ({ default: m.PostingEnginePage })));
const AccrualsPage = lazy(() => import("./pages/finance/AccrualsPage").then((m) => ({ default: m.AccrualsPage })));
const YearEndClosePage = lazy(() => import("./pages/finance/YearEndClosePage").then((m) => ({ default: m.YearEndClosePage })));
const FiscalYearsPage = lazy(() => import("./pages/finance/FiscalYearsPage").then((m) => ({ default: m.FiscalYearsPage })));

// HR new pages (lazy-loaded)
const HRTasksPage = lazy(() => import("./pages/hr/HRTasksPage").then((m) => ({ default: m.HRTasksPage })));
const HRMyTasksPage = lazy(() => import("./pages/hr/HRMyTasksPage").then((m) => ({ default: m.HRMyTasksPage })));

// Procurement new pages (lazy-loaded)
const PurchaseInvoicePage = lazy(() => import("./pages/procurement/PurchaseInvoicePage").then((m) => ({ default: m.PurchaseInvoicePage })));
const ProcurementTasksPage = lazy(() => import("./pages/procurement/ProcurementTasksPage").then((m) => ({ default: m.ProcurementTasksPage })));
const ProcurementMyTasksPage = lazy(() => import("./pages/procurement/ProcurementMyTasksPage").then((m) => ({ default: m.ProcurementMyTasksPage })));
const SentRequestsPage = lazy(() => import("./pages/procurement/SentRequestsPage").then((m) => ({ default: m.SentRequestsPage })));
const ReceivedQuotesPage = lazy(() => import("./pages/procurement/ReceivedQuotesPage").then((m) => ({ default: m.ReceivedQuotesPage })));
const SupplierCompliancePage = lazy(() => import("./pages/procurement/SupplierCompliancePage").then((m) => ({ default: m.SupplierCompliancePage })));

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
              { path: "payroll", Component: PayrollIntegrationPage },
              { path: "claims", Component: ClaimsManagementPage },
              { path: "approvals", Component: FinanceApprovalsPage },
              { path: "ledger", Component: TransactionsLedgerPage },
              { path: "reports", Component: FinanceReportsPage },
              { path: "config", Component: FinanceConfigPage },
              { path: "tasks", Component: FinanceTasksPage },
              { path: "my-tasks", Component: FinanceMyTasksPage },
              { path: "process-mapping", Component: ProcessMappingPage },
              { path: "posting-engine", Component: PostingEnginePage },
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
              { index: true, Component: InventoryPage },
              { path: "dashboard", Component: ProcurementDashboardPage },
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
      { index: true, Component: LoginPage },
    ],
  },
]);
