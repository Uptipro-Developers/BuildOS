import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COA: Array<{ code: string; name: string; parentCode?: string }> = [
  // Root accounts
  { code: '1000', name: 'Assets'              },
  { code: '2000', name: 'Liabilities'         },
  { code: '3000', name: 'Equity'              },
  { code: '4000', name: 'Income'              },
  { code: '5000', name: 'Expenses'            },
  // Assets
  { code: '1100', name: 'Current Assets',      parentCode: '1000' },
  { code: '1200', name: 'Fixed Assets',        parentCode: '1000' },
  { code: '1110', name: 'Cash & Bank',         parentCode: '1100' },
  { code: '1120', name: 'Accounts Receivable', parentCode: '1100' },
  { code: '1210', name: 'Plant & Equipment',   parentCode: '1200' },
  // Liabilities
  { code: '2100', name: 'Current Liabilities', parentCode: '2000' },
  { code: '2110', name: 'Accounts Payable',    parentCode: '2100' },
  { code: '2120', name: 'Accrued Expenses',    parentCode: '2100' },
  // Equity
  { code: '3100', name: 'Retained Earnings',   parentCode: '3000' },
  // Income
  { code: '4100', name: 'Contract Revenue',    parentCode: '4000' },
  { code: '4200', name: 'Service Income',      parentCode: '4000' },
  // Expenses
  { code: '5100', name: 'Labour Costs',        parentCode: '5000' },
  { code: '5200', name: 'Material Costs',      parentCode: '5000' },
  { code: '5300', name: 'Equipment Costs',     parentCode: '5000' },
  { code: '5400', name: 'Overhead',            parentCode: '5000' },
];

// Derive account type from the leading digit, matching the 5 frontend AccountTypes.
function typeFromCode(code: string): string {
  const prefix = code[0];
  return prefix === '1' ? 'Assets'
    : prefix === '2' ? 'Liabilities'
    : prefix === '3' ? 'Equity'
    : prefix === '4' ? 'Income'
    : 'Expenses';
}

async function main() {
  console.log('Seeding chart of accounts…');

  // First pass: upsert every account without parentId.
  for (const { parentCode: _pc, ...row } of COA) {
    const type = typeFromCode(row.code);
    await prisma.chartAccount.upsert({
      where: { code: row.code },
      create: { code: row.code, name: row.name, type, category: type },
      update: { name: row.name, type, category: type },
    });
  }

  // Second pass: wire parentId now all IDs exist.
  const all = await prisma.chartAccount.findMany({ select: { id: true, code: true } });
  const codeToId = new Map(all.map((a) => [a.code, a.id]));

  for (const { code, parentCode } of COA) {
    if (!parentCode) continue;
    const parentId = codeToId.get(parentCode);
    if (parentId) {
      await prisma.chartAccount.update({ where: { code }, data: { parentId } });
    }
  }

  console.log(`Done — ${COA.length} accounts upserted.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
