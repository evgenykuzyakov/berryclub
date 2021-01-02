const { Pool } = require('pg');

const INDEXER_DB_CONNECTION = process.env.INDEXER_DB_CONNECTION;

let pool;
async function withPgClient(fn) {
    if (!pool) {
        pool = new Pool({
            connectionString: INDEXER_DB_CONNECTION,
        });
    }
    const client = await pool.connect();

    try {
        return fn(client);
    } finally {
        client.release();
    }
}



async function findEdits(accountId) {
    console.log('findEdits', accountId);

    return withPgClient(async client => {
        const { rows } = await client.query(`
            SELECT included_in_block_timestamp AS block_timestamp, included_in_block_hash AS block_hash
            FROM receipts ${accountId ? '' : `TABLESAMPLE SYSTEM(0.05)`}
            WHERE receiver_account_id = 'berryclub.ek.near'
                ${accountId ? `AND predecessor_account_id = $1` : ''}
            ORDER BY random()
            LIMIT 50
            `, accountId ? [accountId] : []);

        console.log(`Found ${rows.length} rows`);
        return rows;
    })
}

module.exports = { findEdits };