import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';

@Controller()
export class MaterialsController {
    constructor(
        private readonly svc: MaterialsService,
        private readonly adminExtras: AdminExtrasService,
        private readonly responsibilities: ResponsibilitiesService,
    ) { }

    // ── Materials ──
    @Get('materials')
    getAllMaterials(@Query('search') search?: string, @Query('category') category?: string) {
        return this.svc.findAllMaterials(search, category);
    }
    // Catalogue-aware "Add Material" flow: search existing Material rows by
    // name, then apply real stock quantities onto the ones picked.
    // Registered before ':id' so 'search' isn't swallowed by that route.
    @Get('materials/search')
    searchMaterials(@Query('q') q?: string) { return this.adminExtras.searchMaterials(q ?? ''); }
    @Post('materials/stock')
    applyMaterialStockUpdate(@Body() body: any) { return this.adminExtras.applyMaterialStockUpdate(body); }
    @Get('materials/:id')
    getMaterial(@Param('id') id: string) { return this.svc.findMaterial(id); }
    @Post('materials')
    createMaterial(@Body() body: any) { return this.svc.createMaterial(body); }
    @Put('materials/:id')
    updateMaterial(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.svc.updateMaterial(id, body, this.actor(req));
    }
    @Delete('materials/:id')
    @RequiresProcess('p_materials', 'delete')
    deleteMaterial(@Param('id') id: string) { return this.svc.deleteMaterial(id); }

    // ── Stores ──
    @Get('stores')
    async getAllStores(@Query('type') type?: string, @Req() req?: any) {
        return this.svc.findAllStores(type, await this.storeScope(req, 'p_materials'));
    }
    @Get('stores/:id')
    async getStore(@Param('id') id: string, @Req() req?: any) {
        await this.assertStoreScope(req, id, 'p_materials'); return this.svc.findStore(id);
    }
    @Post('stores')
    async createStore(@Body() body: any, @Req() req?: any) {
        await this.assertStorefrontConfiguration(req); return this.svc.createStore(body);
    }
    @Put('stores/:id')
    async updateStore(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        await this.assertStorefrontConfiguration(req); return this.svc.updateStore(id, body);
    }
    @Delete('stores/:id')
    async deleteStore(@Param('id') id: string, @Req() req?: any) {
        await this.assertStorefrontConfiguration(req); return this.svc.deleteStore(id);
    }

    // ── Store Items ──
    @Get('store-items')
    async getAllStoreItems(@Req() req?: any) { return this.svc.findAllStoreItems(await this.storeScope(req, 'p_materials')); }
    @Get('stores/:storeId/items')
    async getStoreItems(@Param('storeId') storeId: string, @Req() req?: any) {
        await this.assertStoreScope(req, storeId, 'p_materials'); return this.svc.findStoreItems(storeId);
    }
    @Post('store-items')
    async createStoreItem(@Body() body: any, @Req() req?: any) {
        await this.assertStoreScope(req, String(body?.storeId ?? ''), 'p_materials'); return this.svc.createStoreItem(body);
    }
    @Put('store-items/:id')
    updateStoreItem(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.svc.updateStoreItem(id, body, this.actor(req));
    }
    @Delete('store-items/:id')
    deleteStoreItem(@Param('id') id: string) { return this.svc.deleteStoreItem(id); }

    // ── Stock Movements ──
    @Get('stock-movements')
    async getAllMovements(@Query('storeId') storeId?: string, @Req() req?: any) {
        if (storeId) await this.assertStoreScope(req, storeId, 'p_stock_movements');
        return this.svc.findAllMovements(storeId, await this.storeScope(req, 'p_stock_movements'));
    }
    @Post('stock-movements')
    async createMovement(@Body() body: any, @Req() req?: any) {
        await this.assertStoreScope(req, String(body?.storeId ?? ''), 'p_stock_movements'); return this.svc.createMovement(body, this.actor(req));
    }

    // ── Approval-controlled amendments ──
    @Get('material-amendments')
    getAmendments(@Query('status') status?: string) { return this.svc.findAmendments(status); }
    @Patch('material-amendments/:id/decision')
    @RequiresProcess('p_materials', 'approve')
    decideAmendment(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        const decision = String(body?.decision ?? '').toLowerCase();
        if (decision !== 'approved' && decision !== 'rejected') throw new ForbiddenException('Decision must be approved or rejected');
        return this.svc.decideAmendment(id, decision, this.actor(req));
    }

    // ── Stock Transfers ──
    @Get('stock-transfers')
    getAllTransfers() { return this.svc.findAllTransfers(); }
    @Get('stock-transfers/:id')
    getTransfer(@Param('id') id: string) { return this.svc.findTransfer(id); }
    @Post('stock-transfers')
    createTransfer(@Body() body: any) { return this.svc.createTransfer(body); }
    @Patch('stock-transfers/:id')
    updateTransfer(@Param('id') id: string, @Body() body: any) { return this.svc.updateTransfer(id, body); }

    // ── Material Requests ──
    @Get('material-requests')
    async getAllRequests(@Query('status') status?: string, @Req() req?: any) {
        return this.svc.findAllRequests(status, await this.storeScope(req, 'p_storefront_material_requests'));
    }
    @Get('material-requests/:id')
    getRequest(@Param('id') id: string) { return this.svc.findRequest(id); }
    @Post('material-requests/batch')
    async createRequestBatch(@Body() body: any, @Req() req?: any) {
        await this.assertStoreScope(req, String(body?.storeId ?? ''), 'p_storefront_material_requests'); return this.svc.createRequestBatch(body);
    }
    @Post('material-requests')
    async createRequest(@Body() body: any, @Req() req?: any) {
        await this.assertStoreScope(req, String(body?.storeId ?? ''), 'p_storefront_material_requests'); return this.svc.createRequest(body);
    }
    /**
     * Status changes to approved/rejected are checked against the Workflow Approval
     * configuration, and a requester may not decide their own request.
     *
     * Hiding the buttons in the UI is not enough on its own — the endpoint was
     * reachable by anyone who could see the request. Edits that do not change the
     * decision (notes, an information request) stay open, since those are how a
     * requester responds.
     */
    @Patch('material-requests/:id')
    async updateRequest(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        const status = String(body?.status ?? '').toLowerCase();
        if (status === 'approved' || status === 'rejected') {
            const user = req?.user;
            const identity = {
                userId: String(user?.sub ?? user?.id ?? ''),
                name: user?.name,
                email: user?.email,
                role: user?.role,
            };
            const existing = await this.svc.findRequest(id).catch(() => null);
            const approvalProcess = existing?.fulfillmentMethod === 'procurement'
                || (existing?.fulfillmentMethod === 'mixed' && body?.fulfillmentMethod === 'procurement')
                ? 'p_material_requests'
                : 'p_storefront_material_requests';
            await this.adminExtras.assertMayApprove(identity, approvalProcess);

            const raisedBy = String(existing?.requestedBy ?? '').trim().toLowerCase();
            const mine = [identity.name, identity.email]
                .map((v) => String(v ?? '').trim().toLowerCase())
                .filter(Boolean);
            // Admins/super roles may decide their own request (e.g. for testing
            // and small-team operation); everyone else is held to separation of
            // duties.
            const isSuper = await this.adminExtras.isSuperUser(identity.userId);
            if (raisedBy && mine.includes(raisedBy) && !isSuper) {
                throw new ForbiddenException(
                    'You raised this request, so it must be approved by someone else.',
                );
            }
            body.approvedBy = identity.name || identity.email || identity.userId || 'Approver';
        }
        return this.svc.updateRequest(id, body);
    }

    private actor(req?: any) {
        const user = req?.user ?? {};
        return {
            userId: user.sub ?? user.id ?? user.userId,
            name: user.name ?? user.fullName,
            email: user.email,
        };
    }

    private userId(req?: any) { return String(req?.user?.sub ?? req?.user?.id ?? ''); }
    private storeScope(req?: any, processId?: string) {
        const userId = this.userId(req);
        return userId ? this.responsibilities.allowedScopeIds(userId, 'storefront', 'store', processId) : Promise.resolve(null);
    }
    private assertStoreScope(req: any, storeId: string, processId?: string) {
        const userId = this.userId(req);
        return userId ? this.responsibilities.assertScope(userId, 'storefront', 'store', storeId, processId) : Promise.resolve();
    }
    private async assertStorefrontConfiguration(req: any) {
        const userId = this.userId(req);
        if (!userId) return;
        const access = (await this.responsibilities.accessForUser(userId)).find((entry) => entry.app === 'storefront');
        if (access?.configured && !access.canConfigure) throw new ForbiddenException('Only the Storefront point person can change store configuration');
    }

    // ── Material Returns ──
    @Get('material-returns')
    getAllReturns(@Query('status') status?: string) { return this.svc.findAllReturns(status); }
    @Get('material-returns/:id')
    getReturn(@Param('id') id: string) { return this.svc.findReturn(id); }
    @Post('material-returns')
    createReturn(@Body() body: any) { return this.svc.createReturn(body); }
    @Patch('material-returns/:id')
    updateReturn(@Param('id') id: string, @Body() body: any) { return this.svc.updateReturn(id, body); }
}
