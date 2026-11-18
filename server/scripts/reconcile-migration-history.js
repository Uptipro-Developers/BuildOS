/*
 * One-time repair for a migration that was applied in shared environments but
 * never committed to Git. The recovered migration is functionally equivalent
 * and idempotent, but necessarily has a different checksum.
 *
 * This script changes nothing unless both the migration name and the exact
 * historical checksum match. Fresh databases and already-reconciled databases
 * are no-ops. Keep it in the deploy command until every long-lived environment
 * has passed through this release.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const MIGRATION = '20260827100000_material_type_unit_optional';
const HISTORICAL_CHECKSUM = '2ccdb9ef474bcaf45c4261f6c35614ca1f9c400353e131fc9c812e957f163ac8';
const RECOVERED_CHECKSUM = '481df2de27bd46eb428c2c8b17758222681ae33e83a62a4953e34b3d43ad1ee3';

async function main() {
  const prisma = new PrismaClient();
  try {
    const table = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public._prisma_migrations')::text AS name`,
    );
    if (!table[0]?.name) return;

    const changed = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations"
       SET "checksum" = $1
       WHERE "migration_name" = $2 AND "checksum" = $3`,
      RECOVERED_CHECKSUM,
      MIGRATION,
      HISTORICAL_CHECKSUM,
    );
    if (changed === 1) {
      console.log(`[migration-history] reconciled ${MIGRATION}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[migration-history] reconciliation failed:', error.message);
  process.exitCode = 1;
});
