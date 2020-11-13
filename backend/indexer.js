const { Client } = require('pg');

const INDEXER_DB_CONNECTION = process.env.INDEXER_DB_CONNECTION;

let client;
async function getPgClient() {
    if (!client) {
        client = new Client({
            connectionString: INDEXER_DB_CONNECTION,
        });
        await client.connect();
    }

    return client;
}

async function findEdits(accountId) {
    console.log('findEdits', accountId);

    const client = await getPgClient();
    const { rows } = await client.query(`
        SELECT block_timestamp, block_hash FROM receipts
        WHERE receiver_id = 'berryclub.ek.near'
            AND predecessor_id = $1
        ORDER BY random()
        LIMIT 50
        `, [accountId]);

    console.log(`Found ${rows.length} rows`);

    if (rows.length === 0) {
        return null;
    }

    return rows;
}

module.exports = { findEdits };