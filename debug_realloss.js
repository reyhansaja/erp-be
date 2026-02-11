const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = require('./src/utils/prisma');

async function main() {
    console.log('Testing REAL_LOSS update with undefined fields...');
    const id = 'DEBUG-' + Date.now();

    try {
        // Create
        await prisma.prospect.create({
            data: {
                no_project: id,
                name_project: 'Debug Prospect',
                client_name: 'Debug Client',
                contact_name: 'Debug Contact',
                status: 'LOSS'
            }
        });

        // Update with undefined fields (Simulating controller)
        const updateData = {
            status: 'REAL_LOSS',
            name_project: undefined,
            client_name: undefined,
            contact_name: undefined
        };

        console.log('Updating with data:', updateData);

        const prospect = await prisma.prospect.update({
            where: { no_project: id },
            data: updateData
        });
        console.log('Successfully updated prospect status to:', prospect.status);

        // Simulate Project creation logic
        if (prospect.status === 'REAL_LOSS') {
            const isDone = true;
            await prisma.project.create({
                data: {
                    prospectId: id,
                    is_done: isDone
                }
            });
            console.log('Project created successfully.');
        }

    } catch (e) {
        console.error('FULL ERROR:', e);
    } finally {
        // Cleanup
        try {
            await prisma.project.deleteMany({ where: { prospectId: id } });
            await prisma.prospect.delete({ where: { no_project: id } });
        } catch (cleanupError) {
            console.log('Cleanup error (might be expected):', cleanupError.message);
        }
        await prisma.$disconnect();
    }
}

main();
