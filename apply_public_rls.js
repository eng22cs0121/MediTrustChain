async function addPublicRLS() {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) {
        throw new Error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
    }
    const projectRef = 'idmmiqypcjxejoyyhahj';

    const sqlQuery = `
        CREATE POLICY "public_select_batches" ON batches FOR SELECT USING (true);
        CREATE POLICY "public_select_history" ON batch_history FOR SELECT USING (true);
    `;

    try {
        console.log('Sending RLS update to Supabase Cloud via Management API...');
        const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: sqlQuery
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Update failed:', error);
            process.exit(1);
        }

        console.log('SUCCESS! Public RLS added.');
    } catch (error) {
        console.error('Error executing update:', error);
    }
}

addPublicRLS();
