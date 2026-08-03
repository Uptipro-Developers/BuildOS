import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, RequireApp } from '../auth/decorators';
import { AdminExtrasService } from './admin-extras.service';

@Controller()
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

    /**
     * Report templates that have been deployed from Report Builder, optionally
     * for one application.
     *
     * Deliberately open to any authenticated user: each app's Reports module
     * lists these, and gating it on `admin` would leave every non-admin looking
     * at a Reports page with nothing on it. Only deployed templates are returned
     * — a draft is still being edited — and the payload is configuration
     * (name, source, fields), not report data. Running one still goes through
     * `/reports/run`, which resolves fields through the registry.
     */
    @Get('report-templates/deployed')
    getDeployedReportTemplates(@Query('app') app?: string) {
        return this.svc.findDeployedReportTemplates(app);
    }

    @Get('company-profile')
    @Roles('admin')
    @RequireApp('admin')
    getCompanyProfile() {
        return this.svc.getCompanyProfile();
    }

    @Put('company-profile')
    @Roles('admin')
    @RequireApp('admin')
    updateCompanyProfile(@Body() body: any) {
        return this.svc.updateCompanyProfile(body);
    }
}
