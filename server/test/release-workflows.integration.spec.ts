import { PrismaClient } from '@prisma/client';
import { ProcurementRequestsService } from '../src/procurement-requests/procurement-requests.service';

describe('release workflow persistence', () => {
  const prisma = new PrismaClient();
  const ids: { supplier?: string; po?: string; invoice?: string; level?: string } = {};

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    if (ids.invoice) await prisma.purchaseInvoice.deleteMany({ where: { id: ids.invoice } });
    if (ids.po) {
      await prisma.pOItem.deleteMany({ where: { purchaseOrderId: ids.po } });
      await prisma.purchaseOrder.deleteMany({ where: { id: ids.po } });
    }
    if (ids.level) await prisma.projectBoqLevel.deleteMany({ where: { id: ids.level } });
    if (ids.supplier) await prisma.supplier.deleteMany({ where: { id: ids.supplier } });
    await prisma.$disconnect();
  });

  it('persists BoQ PO approval fields and synchronises partial payments', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const supplier = await prisma.supplier.create({
      data: {
        name: `Release Supplier ${suffix}`,
        contactPerson: 'Release Test',
        phone: '0000000000',
        email: `release-${suffix}@example.test`,
        city: 'Lagos',
        categories: ['Materials'],
      },
    });
    ids.supplier = supplier.id;

    const level = await prisma.projectBoqLevel.create({
      data: {
        projectId: `release-project-${suffix}`,
        name: 'Substructure',
        items: {
          create: {
            description: 'OPC Cement',
            unit: 'bags',
            quantity: 10,
            unitRate: 100,
          },
        },
      },
      include: { items: true },
    });
    ids.level = level.id;

    const po = await prisma.purchaseOrder.create({
      data: {
        poRef: `REL-PO-${suffix}`,
        supplierId: supplier.id,
        sourceType: 'project_boq',
        projectId: level.projectId,
        projectName: 'Release Project',
        boqItemIds: [level.items[0].id],
        createdBy: 'Release Test',
        expectedDate: new Date(Date.now() + 86_400_000),
        totalValue: 1000,
        status: 'po_created',
        approvalStatus: 'approved',
        approvedBy: 'Procurement Manager',
        approvedAt: new Date(),
        items: {
          create: {
            material: 'OPC Cement',
            qty: 10,
            unit: 'bags',
            unitCost: 100,
            boqItemId: level.items[0].id,
          },
        },
      },
      include: { items: true },
    });
    ids.po = po.id;
    expect(po.items[0].boqItemId).toBe(level.items[0].id);
    expect(po.approvalStatus).toBe('approved');

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNo: `REL-PI-${suffix}`,
        poRef: po.poRef,
        supplierName: supplier.name,
        supplierId: supplier.id,
        invoiceDate: new Date(),
        lines: [{ description: 'OPC Cement', qty: 10, unit: 'bags', unitPrice: 100 }],
        subtotal: 1000,
        total: 1000,
        status: 'approved',
      },
    });
    ids.invoice = invoice.id;

    const service = new ProcurementRequestsService(
      prisma as any,
      { triggerWebhook: jest.fn() } as any,
      { enqueueEmail: jest.fn() } as any,
      { allocate: jest.fn() } as any,
      { dispatch: jest.fn() } as any,
    );

    const partial = await service.recordInvoicePayment(invoice.id, {
      amount: 400,
      method: 'Bank Transfer',
      reference: `REL-PAY-1-${suffix}`,
      recordedBy: 'Finance Manager',
    });
    expect(partial.status).toBe('partially_paid');
    expect(partial.paidAmount).toBe(400);

    const afterPartial = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(afterPartial.paidAmount).toBe(400);
    expect(afterPartial.status).toBe('po_created');

    const final = await service.recordInvoicePayment(invoice.id, {
      amount: 600,
      method: 'Bank Transfer',
      reference: `REL-PAY-2-${suffix}`,
      recordedBy: 'Finance Manager',
    });
    expect(final.status).toBe('paid');
    expect(final.paidAmount).toBe(1000);

    const afterFinal = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(afterFinal.paidAmount).toBe(1000);
    expect(afterFinal.status).toBe('paid');
  });
});
