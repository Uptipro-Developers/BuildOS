import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

export enum DeliverySplit {
    PreDelivery = 'pre_delivery',
    PostDelivery = 'post_delivery',
}

export enum TrancheTiming {
    OnPoApproval = 'on_po_approval',
    OnDelivery = 'on_delivery',
    Net30 = 'net_30',
    Net60 = 'net_60',
}

export class TrancheDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    percent: number;

    @IsEnum(TrancheTiming)
    timing: TrancheTiming;
}

export class CreatePaymentTermDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(DeliverySplit)
    deliverySplit: DeliverySplit;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => TrancheDto)
    tranches: TrancheDto[];
}

export class UpdatePaymentTermDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(DeliverySplit)
    deliverySplit?: DeliverySplit;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => TrancheDto)
    tranches?: TrancheDto[];
}
