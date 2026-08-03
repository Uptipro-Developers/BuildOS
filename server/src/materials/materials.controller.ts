import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller()
export class MaterialsController {
    constructor(
        private readonly svc: MaterialsService,
        private readonly adminExtras: AdminExtrasService,
    ) { }

    // ── Materials ──
    @Get('materials')
    getAllMaterials(@Query('search') search?: string, @Query('category') category?: string) {
        return this.svc.findAllMaterials(search, category);
    }
    @Get('materials/:id')
    getMaterial(@Param('id') id: string) { return this.svc.findMaterial(id); }
    @Post('materials')
    createMaterial(@Body() body: any) { return this.svc.createMaterial(body); }
    @Put('materials/:id')
    updateMaterial(@Param('id') id: string, @Body() body: any) { return this.svc.updateMaterial(id, body); }
    @Delete('materials/:id')
    @RequiresProcess('p_materials', 'delete')
    deleteMaterial(@Param('id') id: string) { return this.svc.deleteMaterial(id); }

    // ── Stores ──
    @Get('stores')
    getAllStores(@Query('type') type?: string) { return this.svc.findAllStores(type); }
    @Get('stores/:id')
    getStore(@Param('id') id: string) { return this.svc.findStore(id); }
    @Post('stores')
    createStore(@Body() body: any) { return this.svc.createStore(body); }
    @Put('stores/:id')
    updateStore(@Param('id') id: string, @Body() body: any) { return this.svc.updateStore(id, body); }
    @Delete('stores/:id')
    deleteStore(@Param('id') id: string) { return this.svc.deleteStore(id); }

    // ── Store Items ──
    @Get('store-items')
    getAllStoreItems() { return this.svc.findAllStoreItems(); }
    @Get('stores/:storeId/items')
    getStoreItems(@Param('storeId') storeId: string) { return this.svc.findStoreItems(storeId); }
    @Post('store-items')
    createStoreItem(@Body() body: any) { return this.svc.createStoreItem(body); }
    @Put('store-items/:id')
    updateStoreItem(@Param('id') id: string, @Body() body: any) { return this.svc.updateStoreItem(id, body); }
    @Delete('store-items/:id')
    deleteStoreItem(@Param('id') id: string) { return this.svc.deleteStoreItem(id); }

    // ── Stock Movements ──
    @Get('stock-movements')
    getAllMovements(@Query('storeId') storeId?: string) { return this.svc.findAllMovements(storeId); }
    @Post('stock-movements')
    createMovement(@Body() body: any) { return this.svc.createMovement(body); }

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
    getAllRequests(@Query('status') status?: string) { return this.svc.findAllRequests(status); }
    @Get('material-requests/:id')
    getRequest(@Param('id') id: string) { return this.svc.findRequest(id); }
    @Post('material-requests')
    createRequest(@Body() body: any) { return this.svc.createRequest(body); }
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
            await this.adminExtras.assertMayApprove(identity, 'p_material_requests');

            const existing = await this.svc.findRequest(id).catch(() => null);
            const raisedBy = String(existing?.requestedBy ?? '').trim().toLowerCase();
            const mine = [identity.name, identity.email]
                .map((v) => String(v ?? '').trim().toLowerCase())
                .filter(Boolean);
            if (raisedBy && mine.includes(raisedBy)) {
                throw new ForbiddenException(
                    'You raised this request, so it must be approved by someone else.',
                );
            }
        }
        return this.svc.updateRequest(id, body);
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
