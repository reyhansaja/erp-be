require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Starting reproduction script...");

    // 1. Create a LEAD prospect
    const no_project = "TEST-PROJ-" + Date.now();
    console.log(`Creating prospect ${no_project}...`);

    const prospect = await prisma.prospect.create({
        data: {
            no_project,
            name_project: "Test Project Creation",
            client_name: "Test Client",
            contact_name: "Tester",
            status: "LEAD"
        }
    });
    console.log("Created prospect:", prospect);

    // 2. Mock the controller logic (simulate update)
    // We can't call the controller directly properly without req/res mocks, gets messy.
    // Instead, let's replicate the logic EXACTLY as it is in the controller.

    console.log("Simulating update to WON...");
    const id = no_project;
    const status = "WON";

    const oldProspect = await prisma.prospect.findUnique({ where: { no_project: id } });

    const updatedProspect = await prisma.prospect.update({
        where: { no_project: id },
        data: { status }
    });
    console.log("Updated prospect:", updatedProspect);

    // The logic from controller:
    if (oldProspect.status !== 'WON' && updatedProspect.status === 'WON') {
        console.log(`Prospect ${id} transitioning to WON. Checking for existing project...`);
        const existingProject = await prisma.project.findUnique({ where: { prospectId: id } });

        if (!existingProject) {
            console.log(`Creating new project for prospect ${id}`);
            try {
                const project = await prisma.project.create({
                    data: {
                        prospectId: id,
                    },
                });
                console.log(`Project created:`, project);
            } catch (createError) {
                console.error(`Failed to create project:`, createError);
            }
        } else {
            console.log(`Project already exists.`);
        }
    } else {
        console.log(`Logic condition failed: Old: ${oldProspect.status}, New: ${updatedProspect.status}`);
    }

    // 3. Verify in DB
    const finalProject = await prisma.project.findUnique({ where: { prospectId: id } });
    console.log("Final Project in DB:", finalProject);

    // Cleanup
    await prisma.subtask.deleteMany({ where: { project: { prospectId: id } } }); // if any
    await prisma.project.deleteMany({ where: { prospectId: id } });
    await prisma.prospect.delete({ where: { no_project: id } });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
