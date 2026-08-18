import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators';
import { AdminExtrasService } from './admin-extras.service';

@Controller()
export class ApprovalsPublicController {
    constructor(private readonly svc: AdminExtrasService) { }

    /**
     * `mine=true` returns only the items whose configured workflow names the caller
     * as an approver — the queue an approver actually needs to act on.
     *
     * The caller's identity is always resolved and passed through, not only when
     * `mine=true` is set: `findApprovals` enforces server-side that a non-admin
     * only ever sees their own assigned approvals, regardless of this flag. Only
     * an admin's own voluntary mine/all toggle (Admin ▸ Approvals) is honoured
     * as requested.
     */
    @Get('approvals')
    @Roles('admin', 'approver', 'manager', 'hr-manager', 'finance-manager', 'procurement-manager')
    getApprovals(
        @Req() req: Request,
        @Query('module') module?: string,
        @Query('mine') mine?: string,
    ) {
        const user = req.user as any;
        const wantsMine = String(mine ?? '').toLowerCase() === 'true';
        return this.svc.findApprovals(
            module,
            {
                userId: String(user?.sub ?? user?.id ?? ''),
                name: user?.name,
                email: user?.email,
                role: user?.role,
            },
            { onlyMine: wantsMine },
        );
    }

    @Patch('approvals/:id')
    @Roles('admin', 'approver')
    updateApproval(@Param('id') id: string, @Body() body: any) {
        return this.svc.updateApproval(id, body);
    }
}
