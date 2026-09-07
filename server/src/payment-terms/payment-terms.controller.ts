import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PaymentTermsService } from './payment-terms.service';
import { CreatePaymentTermDto, UpdatePaymentTermDto } from './payment-terms.dto';

@Controller('payment-terms')
export class PaymentTermsController {
    constructor(private readonly svc: PaymentTermsService) { }

    @Get()
    findAll() {
        return this.svc.findAll();
    }

    @Post()
    create(@Body() body: CreatePaymentTermDto) {
        return this.svc.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: UpdatePaymentTermDto) {
        return this.svc.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.svc.remove(id);
    }

    @Post(':id/set-default')
    setDefault(@Param('id') id: string) {
        return this.svc.setDefault(id);
    }
}
