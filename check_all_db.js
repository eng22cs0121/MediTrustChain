const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  throw new Error('Missing SUPABASE_ACCESS_TOKEN environment variable.');
}
const projectRef = 'idmmiqypcjxejoyyhahj';

async function queryAllTables() {
  const sql = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: sql })
  });
  
  const result = await response.json();
  
  const schema = {};
  for (const row of result) {
    if (!schema[row.table_name]) {
      schema[row.table_name] = [];
    }
    schema[row.table_name].push({ column: row.column_name, type: row.data_type });
  }
  
  console.log(JSON.stringify(schema, null, 2));
}
queryAllTables();
