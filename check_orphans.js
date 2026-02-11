require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Checking for orphaned WON prospects...");

    // Get all WON prospects
    const wonProspects = await prisma.prospect.findMany({
        where: { status: 'WON' },
        include: { project: true }
    });

    console.log(`Found ${wonProspects.length} WON prospects.`);

    const orphans = wonProspects.filter(p => !p.project);

    if (orphans.length > 0) {
        console.log(`Found ${orphans.length} orphans (WON but no project):`);
        orphans.forEach(p => console.log(`- ${p.no_project}: ${p.name_project}`));

        // Optional: Fix them?
        // Uncomment to fix
        /*
        for (const p of orphans) {
            console.log(`Creating project for ${p.no_project}...`);
            await prisma.project.create({
                data: { prospectId: p.no_project }
            });
        }
        */
    } else {
        console.log("No orphans found. All WON prospects have projects.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
