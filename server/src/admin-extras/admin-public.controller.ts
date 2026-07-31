import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { AdminExtrasService } from './admin-extras.service';

@Controller()
@UseGuards(RolesGuard)
export class AdminPublicController {
    constructor(private readonly svc: AdminExtrasService) { }

    /**
     * Shared lookup lists for form dropdowns — id/name pairs for projects,
     * suppliers, materials, stores, departments, claim and leave types, and chart
     * accounts. No amounts, no personal data, nothing admin-only.
     *
     * This was `@Roles('admin')`, which broke it for every non-admin: Storefront's
     * All Materials and Material Returns, and Procurement's Material Requests,
     * Purchase Requests, Purchase Orders, Sent Requests, Received Quotes and Goods
     * Receipt all load it on mount, so a user with legitimate access to those
     * modules was met with "User does not have required role(s): admin".
     *
     * Access to a module is decided by the role's Layer 1/Layer 2 configuration and
     * its process permissions, not by holding the admin role — so gating a shared
     * lookup endpoint on `admin` was enforcing a rule the permission model does not
     * have. Authentication is still required via the global JWT guard.
     */
    @Get('reference-data')
    getReferenceData() {
        return this.svc.referenceData();
    }

    @Get('company-profile')
    @Roles('admin')
    getCompanyProfile() {
        return this.svc.getCompanyProfile();
    }

    @Put('company-profile')
    @Roles('admin')
    updateCompanyProfile(@Body() body: any) {
        return this.svc.updateCompanyProfile(body);
    }
}
