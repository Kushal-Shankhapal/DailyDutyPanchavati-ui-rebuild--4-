import pg from 'pg';
const p = new pg.Pool({ host:'127.0.0.1', port:5432, user:'postgres', database:'panchavati3_dev' });
console.log((await p.query(`select table_name, column_name from information_schema.columns where column_name like '%location%' and table_schema='public' order by table_name`)).rows.map(r=>r.table_name+'.'+r.column_name).join('\n'));
await p.end();
