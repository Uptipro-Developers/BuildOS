import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Columns accepted from clients; everything else is dropped. */
const ACCRUAL_FIELDS = [
    'reference', 'type', 'title', 'description', 'amount', 'status',
    'approvalStatus', 'approvalSteps', 'createdBy', 'reversalDate',
    'reversedAt', 'reversedAmount', 'sourceModule', 'sourceRef',
    'fiscalYearId', 'notes',
] as const;

const DATE_FIELDS = new Set(['reversalDate', 'reversedAt']);

interface AccrualLineInput {
    account?: string;
    description?: string;
    debit?: number;
    credit?: number;
}

function sanitizeAccrualInput(data: any): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of ACCRUAL_FIELDS) {
        if (data?.[key] === undefined) continue;
        if (DATE_FIELDS.has(key)) {
            out[key] = data[key] ? new Date(data[key]) : null;
        } else {
            out[key] = data[key];
        }
    }
    return out;
}

function sanitizeLines(lines: unknown): AccrualLineInput[] {
    if (!Array.isArray(lines)) return [];
    return lines.map((l: any) => ({
        account: String(l?.account ?? ''),
        description: String(l?.description ?? ''),
        debit: Number(l?.debit ?? 0) || 0,
        credit: Number(l?.credit ?? 0) || 0,
    }));
}

@Injectable()
export class AccrualsService {
    constructor(private prisma: PrismaService) { }

    findAll(status?: string, fiscalYearId?: string) {
        return this.prisma.accrual.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(fiscalYearId ? { fiscalYearId } : {}),
            },
            include: { lines: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    findOne(id: string) {
        return this.prisma.accrual.findUniqueOrThrow({
            where: { id },
            include: { lines: true },
        });
    }

    async create(data: any) {
        const clean = sanitizeAccrualInput(data);
        const lines = sanitizeLines(data?.lines);

        // An accrual is a journal: it only makes sense if it balances.
        this.assertBalanced(lines);

        const suppliedReference = String(clean.reference ?? '').trim();
        clean.reference = suppliedReference || this.generateReference();
        clean.createdBy = clean.createdBy ?? 'System';
        // Trust the sum of the lines over a client-supplied total.
        clean.amount = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0) || clean.amount || 0;

        try {
            return await this.prisma.accrual.create({
                data: {
                    ...(clean as any),
                    lines: lines.length ? { create: lines as any } : undefined,
                },
                include: { lines: true },
            });
        } catch (error: any) {
            // P2002 = unique constraint. A reference the user typed themselves is a
            // real conflict they need to know about; report it clearly instead of
            // surfacing an opaque 500.
            if (error?.code === 'P2002') {
                throw new ConflictException(
                    `Accrual reference "${clean.reference}" is already in use`,
                );
            }
            throw error;
        }
    }

    private generateReference() {
        return `ACC-${Date.now()}-${randomUUID().slice(0, 8)}`;
    }

    async update(id: string, data: any) {
        const clean = sanitizeAccrualInput(data);
        const hasLines = Array.isArray(data?.lines);
        const lines = hasLines ? sanitizeLines(data.lines) : [];

        if (hasLines) {
            this.assertBalanced(lines);
            clean.amount = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
        }

        return this.prisma.accrual.update({
            where: { id },
            data: {
                ...(clean as any),
                ...(hasLines
                    ? { lines: { deleteMany: {}, create: lines as any } }
                    : {}),
            },
            include: { lines: true },
        });
    }

    remove(id: string) {
        return this.prisma.accrual.delete({ where: { id } });
    }

    /**
     * Reverses an accrual, in full or in part. Partial reversals keep the
     * accrual open so the remainder can still be reversed later.
     */
    async reverse(id: string, amount?: number, reversedAt?: string) {
        const accrual = await this.prisma.accrual.findUniqueOrThrow({ where: { id } });
        const alreadyReversed = accrual.reversedAmount ?? 0;
        const outstanding = accrual.amount - alreadyReversed;
        if (outstanding <= 0) {
            throw new BadRequestException('This accrual has already been fully reversed');
        }

        const requested = amount === undefined || amount === null ? outstanding : Number(amount);
        if (!Number.isFinite(requested) || requested <= 0) {
            throw new BadRequestException('Reversal amount must be greater than zero');
        }
        if (requested > outstanding) {
            throw new BadRequestException(
                `Reversal amount exceeds the outstanding balance of ${outstanding}`,
            );
        }

        const totalReversed = alreadyReversed + requested;
        return this.prisma.accrual.update({
            where: { id },
            data: {
                reversedAmount: totalReversed,
                reversedAt: reversedAt ? new Date(reversedAt) : new Date(),
                status: totalReversed >= accrual.amount ? 'fully-reversed' : 'partially-reversed',
            },
            include: { lines: true },
        });
    }

    /** Records an approval decision and moves the accrual's status with it. */
    async decide(id: string, decision: 'approved' | 'rejected', actedBy?: string, comment?: string) {
        const accrual = await this.prisma.accrual.findUniqueOrThrow({ where: { id } });
        const steps = Array.isArray(accrual.approvalSteps) ? [...(accrual.approvalSteps as any[])] : [];
        steps.push({
            role: actedBy ?? 'Approver',
            action: decision,
            actedBy: actedBy ?? 'Approver',
            actedAt: new Date().toISOString(),
            ...(comment ? { comment } : {}),
        });

        return this.prisma.accrual.update({
            where: { id },
            data: {
                approvalStatus: decision,
                // An approved accrual becomes live; a rejected one goes back to draft.
                status: decision === 'approved' ? 'active' : 'draft',
                approvalSteps: steps as any,
            },
            include: { lines: true },
        });
    }

    /** Debits must equal credits, and the entry must be non-zero. */
    private assertBalanced(lines: AccrualLineInput[]) {
        if (lines.length === 0) return;
        const debits = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
        const credits = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
        if (debits <= 0) {
            throw new BadRequestException('Accrual must have a non-zero amount');
        }
        // Tolerate float noise from the client's number inputs.
        if (Math.abs(debits - credits) > 0.005) {
            throw new BadRequestException(
                `Accrual is not balanced: debits ${debits} vs credits ${credits}`,
            );
        }
    }

    // ── Accrual type configuration ──
    findTypes() {
        return this.prisma.accrualTypeConfig.findMany({ orderBy: { label: 'asc' } });
    }

    createType(data: any) {
        return this.prisma.accrualTypeConfig.create({
            data: {
                type: String(data?.type ?? '').trim(),
                label: String(data?.label ?? '').trim(),
                ...(data?.color ? { color: data.color } : {}),
                ...(data?.description ? { description: data.description } : {}),
            },
        });
    }

    updateType(id: string, data: any) {
        const { id: _ignored, createdAt, updatedAt, ...rest } = data ?? {};
        return this.prisma.accrualTypeConfig.update({ where: { id }, data: rest });
    }

    removeType(id: string) {
        return this.prisma.accrualTypeConfig.delete({ where: { id } });
    }
}
