import { ForbiddenException } from '@nestjs/common';
import { ResponsibilitiesService } from './responsibilities.service';

describe('ResponsibilitiesService authorization', () => {
    const prisma: any = { user: { findUnique: jest.fn() } };
    const service = new ResponsibilitiesService(prisma, {} as any);

    beforeEach(() => jest.clearAllMocks());

    it('does not treat Site Supervisor as an administrator', async () => {
        prisma.user.findUnique.mockResolvedValue({ role: 'Site Supervisor', roles: [] });
        await expect((service as any).isAdmin('user-1')).resolves.toBe(false);
    });

    it('accepts explicit administrator roles', async () => {
        prisma.user.findUnique.mockResolvedValue({ role: 'Administrator', roles: [] });
        await expect((service as any).isAdmin('user-1')).resolves.toBe(true);
    });

    it('rejects edit when the project assignment is view-only', async () => {
        jest.spyOn(service, 'accessForUser').mockResolvedValue([{
            app: 'construction', configured: true, unrestricted: false,
            isOwner: false, canConfigure: false, canAssign: false,
            assignments: [{
                processId: 'p_projects', permissions: ['view'],
                scopeType: 'project', scopeId: 'project-a',
            }],
        }] as any);
        await expect(service.assertProcessAction(
            'user-1', 'construction', 'p_projects', 'edit', 'project', 'project-a',
        )).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows view inside the assigned project', async () => {
        jest.spyOn(service, 'accessForUser').mockResolvedValue([{
            app: 'construction', configured: true, unrestricted: false,
            isOwner: false, canConfigure: false, canAssign: false,
            assignments: [{
                processId: 'p_projects', permissions: ['view'],
                scopeType: 'project', scopeId: 'project-a',
            }],
        }] as any);
        await expect(service.assertProcessAction(
            'user-1', 'construction', 'p_projects', 'view', 'project', 'project-a',
        )).resolves.toBeUndefined();
    });
});
