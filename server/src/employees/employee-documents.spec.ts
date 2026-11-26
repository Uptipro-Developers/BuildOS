import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';

describe('EmployeesService document CRUD', () => {
    const makeService = () => {
        const prisma: any = {
            employee: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'emp-1' }) },
            documentUpload: {
                create: jest.fn(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
                findFirst: jest.fn().mockResolvedValue({
                    id: 'doc-1', employeeId: 'emp-1', fileName: 'contract.pdf',
                    fileUrl: 'data:application/pdf;base64,AA==', fileSize: 2,
                    mimeType: 'application/pdf', documentType: 'Employment Contract',
                }),
                update: jest.fn(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
                delete: jest.fn().mockResolvedValue({ id: 'doc-1' }),
            },
        };
        return { prisma, service: new EmployeesService(prisma, {} as any, {} as any, {} as any) };
    };

    it('requires a document type when creating a document', async () => {
        const { service } = makeService();
        await expect(service.addDocument('emp-1', {
            fileName: 'contract.pdf', fileUrl: 'data:application/pdf;base64,AA==',
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates metadata and an optional replacement file', async () => {
        const { service, prisma } = makeService();
        await service.updateDocument('emp-1', 'doc-1', {
            documentType: 'Identification', description: 'National ID',
            fileName: 'id.pdf', fileUrl: 'data:application/pdf;base64,BB==',
            fileSize: 4, mimeType: 'application/pdf',
        });
        expect(prisma.documentUpload.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'doc-1' },
            data: expect.objectContaining({ documentType: 'Identification', description: 'National ID', fileName: 'id.pdf' }),
        }));
    });

    it('refuses to edit a document outside the employee record', async () => {
        const { service, prisma } = makeService();
        prisma.documentUpload.findFirst.mockResolvedValue(null);
        await expect(service.updateDocument('emp-2', 'doc-1', {
            documentType: 'Other',
        })).rejects.toBeInstanceOf(NotFoundException);
    });
});
