-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "NotificationTemplate" ADD COLUMN "recipients" TEXT;
ALTER TABLE "NotificationTemplate" ADD COLUMN "cc" TEXT;

-- Seed default email-configuration templates (previously hardcoded as MOCK_CONFIGS
-- in AdminEmailSettingsPage.tsx). "New User Created" is required for the employee
-- onboarding welcome email to send; the rest just give the settings page non-empty
-- defaults matching what admins previously saw. Safe to edit/delete from the UI afterwards.
INSERT INTO "NotificationTemplate" ("id", "eventType", "module", "subject", "body", "recipients", "cc", "isActive", "createdAt", "updatedAt") VALUES
('tpl_leave_request_submitted', 'Leave Request Submitted', 'HR', 'New Leave Request — {{employee_name}}', E'Dear {{employee_manager}},\n\n{{employee_name}} has submitted a leave request ({{leave_type}}) from {{start_date}} to {{end_date}}.\n\nPlease review and approve or reject the request in BuildOS.', 'hr@buildos.ng', '{{employee_manager}}', true, now(), now()),
('tpl_payroll_processed', 'Payroll Processed', 'HR', 'Payroll Processed — {{period}}', E'Dear Team,\n\nPayroll for {{period}} has been processed successfully. Please log in to BuildOS ESS to view your payslip.', 'all-staff@buildos.ng', 'cfo@buildos.ng', true, now(), now()),
('tpl_send_po_to_supplier', 'Send PO to Supplier', 'Procurement', 'Purchase Order {{po_number}} — BuildOS', E'Dear {{supplier_name}},\n\nPlease find attached Purchase Order {{po_number}}. Kindly confirm receipt and expected delivery date.\n\nRegards,\nBuildOS Procurement Team', '{{supplier_email}}', 'procurement@buildos.ng', true, now(), now()),
('tpl_invoice_overdue', 'Invoice Overdue', 'Finance', 'Overdue Invoice Notice — {{invoice_number}}', E'Dear Finance Team,\n\nInvoice {{invoice_number}} for {{invoice_amount}} from {{vendor_name}} is past its due date of {{due_date}}.\n\nPlease take action.', 'finance@buildos.ng', 'cfo@buildos.ng', true, now(), now()),
('tpl_new_user_created', 'New User Created', 'Admin', 'Welcome to BuildOS — {{user_name}}', E'Dear {{user_name}},\n\nYour BuildOS account has been created. Activate it here: {{activation_link}}\n\nPlease contact admin if you have any issues.', '{{user_email}}', 'admin@buildos.ng', true, now(), now()),
('tpl_material_request_approved', 'Material Request Approved', 'Procurement', 'Material Request Approved — {{request_number}}', E'Dear {{requester_email}},\n\nYour material request {{request_number}} has been approved. The procurement team will proceed with sourcing.', '{{requester_email}}', '', false, now(), now()),
('tpl_appraisal_cycle_opened', 'Appraisal Cycle Opened', 'HR', 'Performance Appraisal Cycle Started — {{cycle}}', E'Dear Team,\n\nThe {{cycle}} performance appraisal cycle is now open. Please log in to BuildOS and complete your self-assessment by the deadline.', 'all-staff@buildos.ng', 'hr@buildos.ng', true, now(), now());
