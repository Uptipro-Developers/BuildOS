import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SignatoriesService } from './signatories.service';
import { CreateSignatoryDto, UpdateSignatoryDto } from './signatories.dto';

@Controller('signatories')
export class SignatoriesController {
    constructor(private readonly svc: SignatoriesService) { }

    @Get()
    findAll() {
        return this.svc.findAll();
    }

    @Post()
    create(@Body() body: CreateSignatoryDto) {
        return this.svc.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: UpdateSignatoryDto) {
        return this.svc.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.svc.remove(id);
    }
}
