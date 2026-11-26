import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService submission email routing', () => {
    it('sends separate purpose-built emails to the handover employee and configured approver', async () => {
        const prisma: any = {
            systemSetting: {
                findUnique: jest.fn().mockResolvedValue({
                    value: {
                        processWorkflows: [{
                            processId: 'p_leave_requests',
                            workflowType: 'single',
                            approver: 'Ada Approver',
                        }],
                    },
                }),
            },
            user: {
                findMany: jest.fn().mockResolvedValue([{
                    id: 'user-approver',
                    email: 'approver@example.com',
                    name: 'Ada Approver',
                    role: 'HR Manager',
                }]),
            },
        };
        const mailQueue = { enqueueEmail: jest.fn().mockResolvedValue({ queued: false }) };
        const service = new LeaveRequestsService(
            prisma,
            {} as any,
            {} as any,
            {} as any,
            mailQueue as any,
        );

        await (service as any).sendSubmissionEmails(
            {
                refId: 'LR-100',
                days: 3,
                startDate: new Date('2026-12-01'),
                endDate: new Date('2026-12-03'),
                employee: { firstName: 'Tobi', lastName: 'Requester' },
                leaveType: { name: 'Annual Leave' },
            },
            { firstName: 'Hannah', lastName: 'Handover', email: 'handover@example.com' },
            'workflow-1',
        );

        expect(mailQueue.enqueueEmail).toHaveBeenCalledTimes(2);
        expect(mailQueue.enqueueEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                to: 'handover@example.com',
                subject: 'Leave handover assigned — LR-100',
            }),
        );
        expect(mailQueue.enqueueEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                to: 'approver@example.com',
                subject: 'Leave request awaiting your approval — LR-100',
            }),
        );
    });
});
