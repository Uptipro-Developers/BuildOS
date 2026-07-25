import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { AppLayout } from "./layouts/AppLayout";

// Auth Pages
import { SignupPage } from "./pages/auth/SignupPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";

// App Launcher
import { AppLauncherPage } from "./pages/AppLauncherPage";

// Construction App
import { ConstructionLayout } from "./pages/construction/ConstructionLayout";
import { PortfolioDashboardPage } from "./pages/construction/PortfolioDashboardPage";
import { ProjectsListPage } from "./pages/construction/ProjectsListPage";
import { ProjectTabsLayout } from "./pages/construction/ProjectTabsLayout";
import { ProjectOverviewPage } from "./pages/construction/ProjectOverviewPage";
import { ScheduleOverviewPage } from "./pages/construction/ScheduleOverviewPage";
import { SchedulePage } from "./pages/construction/SchedulePage";
import { DailyReportsOverviewPage } from "./pages/construction/DailyReportsOverviewPage";
import { DailyReportsPage } from "./pages/construction/DailyReportsPage";
import { DailyReportFormPage } from "./pages/construction/DailyReportFormPage";
import { ResourcesOverviewPage } from "./pages/construction/ResourcesOverviewPage";
import { ProjectResourcesPage } from "./pages/construction/ProjectResourcesPage";
import { ResourceDetailPage } from "./pages/construction/ResourceDetailPage";
import { GlobalResourceDetailPage } from "./pages/construction/GlobalResourceDetailPage";
import { IssuesOverviewPage } from "./pages/construction/IssuesOverviewPage";
import { IssuesPage } from "./pages/construction/IssuesPage";
import { ChangeRequestsOverviewPage } from "./pages/construction/ChangeRequestsOverviewPage";
import { ChangeRequestsPage } from "./pages/construction/ChangeRequestsPage";
import { DelaysOverviewPage } from "./pages/construction/DelaysOverviewPage";
import { DelaysPage } from "./pages/construction/DelaysPage";
import { QualityOverviewPage } from "./pages/construction/QualityOverviewPage";
import { QualityPage } from "./pages/construction/QualityPage";
import { HSEOverviewPage } from "./pages/construction/HSEOverviewPage";
import { HSEPage } from "./pages/construction/HSEPage";
import { DocumentsOverviewPage } from "./pages/construction/DocumentsOverviewPage";
import { DocumentsPage } from "./pages/construction/DocumentsPage";
import { CostsOverviewPage } from "./pages/construction/CostsOverviewPage";
import { CostsPage } from "./pages/construction/CostsPage";
import { StakeholdersOverviewPage } from "./pages/construction/StakeholdersOverviewPage";
import { StakeholdersPage } from "./pages/construction/StakeholdersPage";
import { ResourceHubPage } from "./pages/construction/ResourceHubPage";
import { ReportsPage } from "./pages/construction/ReportsPage";
import { ProgressEarnedValuePage } from "./pages/construction/ProgressEarnedValuePage";
import { ProjectSetupPage } from "./pages/construction/ProjectSetupPage";
import { ConstructionSettingsPage } from "./pages/construction/ConstructionSettingsPage";
import { DisbursementsPage } from "./pages/construction/DisbursementsPage";
import { CommunicationLogPage } from "./pages/construction/CommunicationLogPage";
import { FundingPage } from "./pages/construction/FundingPage";
import { FinancialsPage } from "./pages/construction/FinancialsPage";

// Finance App
import { FinanceApprovalsPage } from "./pages/finance/FinanceApprovalsPage";
import { FinanceLayout } from "./pages/finance/FinanceLayout";
import { FinanceDashboardPage } from "./pages/finance/FinanceDashboardPage";
import { ChartOfAccountsPage } from "./pages/finance/ChartOfAccountsPage";
import { ExpenseManagementPage } from "./pages/finance/ExpenseManagementPage";
import { IncomeManagementPage } from "./pages/finance/IncomeManagementPage";
import { BudgetManagementPage } from "./pages/finance/BudgetManagementPage";
import { PaymentManagementPage } from "./pages/finance/PaymentManagementPage";
import { PayrollIntegrationPage } from "./pages/finance/PayrollIntegrationPage";
import { ClaimsManagementPage } from "./pages/finance/ClaimsManagementPage";
import { TransactionsLedgerPage } from "./pages/finance/TransactionsLedgerPage";
import { FinanceReportsPage } from "./pages/finance/FinanceReportsPage";
import { FinanceSettingsPage } from "./pages/finance/FinanceSettingsPage";

// Procurement App
import { ProcurementApprovalsPage } from "./pages/procurement/ProcurementApprovalsPage";
import { ProcurementLayout } from "./pages/procurement/ProcurementLayout";
import { ProcurementDashboardPage } from "./pages/procurement/ProcurementDashboardPage";
import { InventoryPage } from "./pages/procurement/InventoryPage";
import { MaterialRequestsPage } from "./pages/procurement/MaterialRequestsPage";
import { PurchaseRequestsPage } from "./pages/procurement/PurchaseRequestsPage";
import { SuppliersPage } from "./pages/procurement/SuppliersPage";
import { StockLevelsPage } from "./pages/procurement/StockLevelsPage";
import { StockMovementPage } from "./pages/procurement/StockMovementPage";
import { PurchaseOrdersPage } from "./pages/procurement/PurchaseOrdersPage";
import { GoodsReceiptPage } from "./pages/procurement/GoodsReceiptPage";
import { ProcurementReportsPage } from "./pages/procurement/ProcurementReportsPage";
import { ProcurementSettingsPage } from "./pages/procurement/ProcurementSettingsPage";

// HR App
import { HRApprovalsPage } from "./pages/hr/HRApprovalsPage";
import { HRLayout } from "./pages/hr/HRLayout";
import { HRDashboardPage } from "./pages/hr/HRDashboardPage";
import { EmployeesPage } from "./pages/hr/EmployeesPage";
import { EmployeeProfilePage } from "./pages/hr/EmployeeProfilePage";
import { DepartmentsPage } from "./pages/hr/DepartmentsPage";
import { HRRolesPage } from "./pages/hr/HRRolesPage";
import { AttendancePage } from "./pages/hr/AttendancePage";
import { AttendanceLogsPage } from "./pages/hr/AttendanceLogsPage";
import { PayrollPage } from "./pages/hr/PayrollPage";
import { SalaryStructurePage } from "./pages/hr/SalaryStructurePage";
import { PayrollProcessingPage } from "./pages/hr/PayrollProcessingPage";
import { WorkforceAllocationPage } from "./pages/hr/WorkforceAllocationPage";
import { HRReportsPage } from "./pages/hr/HRReportsPage";
import { LeaveRequestsPage } from "./pages/hr/LeaveRequestsPage";
import { LeaveBalancesPage } from "./pages/hr/LeaveBalancesPage";
import { HRSettingsPage } from "./pages/hr/HRSettingsPage";
import { PayrollPeriodPage } from "./pages/hr/PayrollPeriodPage";
import { BankNamesPage } from "./pages/hr/BankNamesPage";
import { LeaveTypeSetupPage } from "./pages/hr/LeaveTypeSetupPage";
import { ClaimTypeSetupPage } from "./pages/hr/ClaimTypeSetupPage";
import { BaseCalendarPage } from "./pages/hr/BaseCalendarPage";

// ESS App
import { ESSApprovalsPage } from "./pages/ess/ESSApprovalsPage";
import { ESSLayout } from "./pages/ess/ESSLayout";
import { ESSDashboardPage } from "./pages/ess/ESSDashboardPage";
import { MyRequestsPage } from "./pages/ess/MyRequestsPage";
import { SubmitRequestPage } from "./pages/ess/SubmitRequestPage";
import { MyProjectsPage } from "./pages/ess/MyProjectsPage";
import { MyProfilePage } from "./pages/ess/MyProfilePage";
import { ActivityHistoryPage } from "./pages/ess/ActivityHistoryPage";
import { MyTasksPage } from "./pages/ess/MyTasksPage";
import { PayslipHistoryPage } from "./pages/ess/PayslipHistoryPage";
import { AppraisalPage } from "./pages/ess/AppraisalPage";

// Admin App
import { AdminApprovalsPage } from "./pages/admin/AdminApprovalsPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { UserPermissionsPage } from "./pages/admin/UserPermissionsPage";
import { CompanyProfilePage } from "./pages/admin/CompanyProfilePage";
import { BoardOfDirectorsPage } from "./pages/admin/BoardOfDirectorsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { UnitsOfMeasurementPage } from "./pages/admin/UnitsOfMeasurementPage";
import { ProjectConfigurationPage } from "./pages/admin/ProjectConfigurationPage";
import { FinancialConfigurationPage } from "./pages/admin/FinancialConfigurationPage";
import { ReportBuilderPage } from "./pages/admin/ReportBuilderPage";
import { NotificationsPage } from "./pages/admin/NotificationsPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { IntegrationsPage } from "./pages/admin/IntegrationsPage";
import { ReportAutomationPage } from "./pages/admin/ReportAutomationPage";
import { AdminEmailSettingsPage } from "./pages/admin/AdminEmailSettingsPage";
import { IssueTypesPage } from "./pages/admin/IssueTypesPage";
import { ChangeCategoriesPage } from "./pages/admin/ChangeCategoriesPage";
import { ChangelogPage } from "./pages/admin/ChangelogPage";

// Storefront App
import { StorefrontLayout } from "./pages/storefront/StorefrontLayout";
import { StorefrontDashboardPage } from "./pages/storefront/StorefrontDashboardPage";
import { AllMaterialsPage } from "./pages/storefront/AllMaterialsPage";
import { GeneralStorePage } from "./pages/storefront/GeneralStorePage";
import { ProjectStoresPage } from "./pages/storefront/ProjectStoresPage";
import { StockMovementPage as StorefrontStockMovementPage } from "./pages/storefront/StockMovementPage";
import { IncomingRequestsPage } from "./pages/storefront/IncomingRequestsPage";
import { StockTransferPage } from "./pages/storefront/StockTransferPage";
import { MaterialReturnsPage } from "./pages/storefront/MaterialReturnsPage";
import { StorefrontApprovalsPage } from "./pages/storefront/StorefrontApprovalsPage";
import { StorefrontReportsPage } from "./pages/storefront/StorefrontReportsPage";
import { StorefrontTasksPage } from "./pages/storefront/StorefrontTasksPage";
import { StorefrontMyTasksPage } from "./pages/storefront/StorefrontMyTasksPage";
import { StorefrontSettingsPage } from "./pages/storefront/StorefrontSettingsPage";

// Finance new pages
import { JournalEntryPage } from "./pages/finance/JournalEntryPage";
import { FinanceTasksPage } from "./pages/finance/FinanceTasksPage";
import { FinanceMyTasksPage } from "./pages/finance/FinanceMyTasksPage";
import { ProcessMappingPage } from "./pages/finance/ProcessMappingPage";
import { PostingEnginePage } from "./pages/finance/PostingEnginePage";
import { AccrualsPage } from "./pages/finance/AccrualsPage";
import { YearEndClosePage } from "./pages/finance/YearEndClosePage";
import { FiscalYearsPage } from "./pages/finance/FiscalYearsPage";

// HR new pages
import { HRTasksPage } from "./pages/hr/HRTasksPage";
import { HRMyTasksPage } from "./pages/hr/HRMyTasksPage";

// Procurement new pages
import { PurchaseInvoicePage } from "./pages/procurement/PurchaseInvoicePage";
import { ProcurementTasksPage } from "./pages/procurement/ProcurementTasksPage";
import { ProcurementMyTasksPage } from "./pages/procurement/ProcurementMyTasksPage";
import { SentRequestsPage } from "./pages/procurement/SentRequestsPage";
import { ReceivedQuotesPage } from "./pages/procurement/ReceivedQuotesPage";
import { SupplierCompliancePage } from "./pages/procurement/SupplierCompliancePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        path: "auth",
        Component: AuthLayout,
        children: [
          { path: "signup", Component: SignupPage },
          { path: "login", Component: LoginPage },
          { path: "verify", Component: VerifyEmailPage },
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
              { index: true, Component: ProjectsListPage },
              { path: "dashboard", Component: PortfolioDashboardPage },
              { path: "schedule", Component: ScheduleOverviewPage },
              { path: "tasks", lazy: () => import("./pages/construction/TasksPage").then(m => ({ Component: m.TasksPage })) },
              { path: "my-tasks", lazy: () => import("./pages/construction/MyTasksPage").then(m => ({ Component: m.MyTasksPage })) },
              { path: "daily-reports", Component: DailyReportsOverviewPage },
              { path: "resources", Component: ResourcesOverviewPage },
              { path: "resources/:resourceId", Component: GlobalResourceDetailPage },
              { path: "issues", Component: IssuesOverviewPage },
              { path: "change-requests", Component: ChangeRequestsOverviewPage },
              { path: "delays", Component: DelaysOverviewPage },
              { path: "quality", Component: QualityOverviewPage },
              { path: "hse", Component: HSEOverviewPage },
              { path: "documents", Component: DocumentsOverviewPage },
              { path: "costs", Component: CostsOverviewPage },
              { path: "finance", lazy: () => import("./pages/construction/FinancePage").then(m => ({ Component: m.FinancePage })) },
              { path: "funding", Component: FundingPage },
              { path: "stakeholders", Component: StakeholdersOverviewPage },
              { path: "reports", Component: ReportsPage },
              { path: "resource-hub", Component: ResourceHubPage },
              { path: "settings", Component: ConstructionSettingsPage },
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
                  { path: "daily-reports/:reportId", Component: DailyReportFormPage },
                  { path: "resources", Component: ProjectResourcesPage },
                  { path: "resources/:resourceId", Component: ResourceDetailPage },
                  { path: "issues", Component: IssuesPage },
                  { path: "change-requests", Component: ChangeRequestsPage },
                  { path: "delays", Component: DelaysPage },
                  { path: "quality", Component: QualityPage },
                  { path: "hse", Component: HSEPage },
                  { path: "documents", Component: DocumentsPage },
                  { path: "financials", Component: FinancialsPage },
                  { path: "stakeholders", Component: StakeholdersPage },
                  { path: "progress", Component: ProgressEarnedValuePage },
                  { path: "setup", Component: ProjectSetupPage },
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
              { path: "settings", Component: FinanceSettingsPage },
              { path: "tasks", Component: FinanceTasksPage },
              { path: "my-tasks", Component: FinanceMyTasksPage },
              { path: "process-mapping", Component: ProcessMappingPage },
              { path: "posting-engine", Component: PostingEnginePage },
              { path: "purchase-invoice", Component: PurchaseInvoicePage },
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
              { path: "supplier-compliance", Component: SupplierCompliancePage },
              { path: "settings", Component: ProcurementSettingsPage },
            ],
          },
          {
            path: "hr",
            Component: HRLayout,
            children: [
              { index: true, Component: EmployeesPage },
              { path: "dashboard", Component: HRDashboardPage },
              { path: "employees/:id", Component: EmployeeProfilePage },
              { path: "departments", Component: DepartmentsPage },
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
              { path: "settings", Component: HRSettingsPage },
              { path: "org-structure", lazy: () => import("./pages/hr/OrgStructurePage").then(m => ({ Component: m.OrgStructurePage })) },
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
              { index: true, Component: MyRequestsPage },
              { path: "dashboard", Component: ESSDashboardPage },
              { path: "submit", Component: SubmitRequestPage },
              { path: "projects", Component: MyProjectsPage },
              { path: "profile", Component: MyProfilePage },
              { path: "activity", Component: ActivityHistoryPage },
              { path: "tasks", Component: MyTasksPage },
              { path: "approvals", Component: ESSApprovalsPage },
              { path: "payslips", Component: PayslipHistoryPage },
              { path: "appraisals", Component: AppraisalPage },
            ],
          },
          {
            path: "admin",
            Component: AdminLayout,
            children: [
              { index: true, Component: UsersPage },
              { path: "dashboard", Component: AdminDashboardPage },
              { path: "users", Component: UsersPage },
              { path: "roles", Component: RolesPage },
              { path: "user-permissions", Component: UserPermissionsPage },
              { path: "company-profile", Component: CompanyProfilePage },
              { path: "board-of-directors", Component: BoardOfDirectorsPage },
              { path: "settings", Component: AdminSettingsPage },
              { path: "units", Component: UnitsOfMeasurementPage },
              { path: "project-config", Component: ProjectConfigurationPage },
              { path: "report-builder", Component: ReportBuilderPage },
              { path: "report-automation", Component: ReportAutomationPage },
              { path: "notifications", Component: NotificationsPage },
              { path: "audit-logs", Component: AuditLogsPage },
              { path: "integrations", Component: IntegrationsPage },
              { path: "approvals", Component: AdminApprovalsPage },
              { path: "email-settings", Component: AdminEmailSettingsPage },
              { path: "issue-types", Component: IssueTypesPage },
              { path: "change-categories", Component: ChangeCategoriesPage },
              { path: "changelog", Component: ChangelogPage },
            ],
          },
          {
            path: "storefront",
            Component: StorefrontLayout,
            children: [
              { index: true, Component: StorefrontDashboardPage },
              { path: "dashboard",         Component: StorefrontDashboardPage },
              { path: "all-materials",     Component: AllMaterialsPage },
              { path: "general-store",     Component: GeneralStorePage },
              { path: "project-stores",    Component: ProjectStoresPage },
              { path: "stock-movement",    Component: StorefrontStockMovementPage },
              { path: "incoming-requests", Component: IncomingRequestsPage },
              { path: "stock-transfers",   Component: StockTransferPage },
              { path: "returns",           Component: MaterialReturnsPage },
              { path: "approvals",         Component: StorefrontApprovalsPage },
              { path: "reports",           Component: StorefrontReportsPage },
              { path: "tasks",             Component: StorefrontTasksPage },
              { path: "my-tasks",          Component: StorefrontMyTasksPage  },
              { path: "settings",            Component: StorefrontSettingsPage  },
            ],
          },
        ],
      },
      { index: true, Component: LoginPage },
    ],
  },
]);
