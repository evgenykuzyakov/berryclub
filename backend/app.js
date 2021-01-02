const { connect, keyStores: { InMemoryKeyStore } } = require('near-api-js');

async function viewPixelBoard(blockId) {
    const config = require('./config')(process.env.NODE_ENV || 'development')
    // TODO: Why no default keyStore?
    const keyStore = new InMemoryKeyStore();
    const near = await connect({...config, keyStore});
    const account = await near.account('berryclub.ek.near');
    if (blockId && /^\d+$/.exec(blockId)) {
        blockId = parseInt(blockId, 10);
    }
    const pixelsState = await account.viewState('p', blockId ? { blockId } : null);
    const lines = pixelsState.map(({key, value}) => {        
        const linePixels = value.slice(4);
        const width = linePixels.length / 8;
        const lineColors = [];
        for (let i = 0; i < width; i++) {
            lineColors.push(linePixels.slice(i * 8, i * 8 + 3).reverse().toString('hex'));
        }
        return lineColors;
    });


    const { createCanvas } = require('canvas');
    const canvas = createCanvas(50, 50);
    const ctx = canvas.getContext('2d');
    lines.forEach((line, y) => {
        line.forEach((color, x) => {
            ctx.fillStyle = `#${color}`;
            ctx.fillRect(x, y, 1, 1);
        });
    });

    return canvas.toBuffer();
}


const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router();


router.get('/img/:blockId?', async ctx => {
    console.log(ctx.path);

    ctx.type = "image/png";
    ctx.body = await viewPixelBoard(ctx.params.blockId);
});

const indexer = require('./indexer');
router.get('/:accountId?', async ctx => {
    console.log(ctx.path);

    const edits = await indexer.findEdits(ctx.params.accountId);
    edits.sort((a, b) => parseFloat(a.block_timestamp) - parseFloat(b.block_timestamp));

    ctx.type = 'text/html';
    ctx.body = `
        <p>Welcome to 🥑 club time machine.

        ${
            edits.map(({ block_hash }) => `<p><img style="image-rendering: pixelated; image-rendering: crisp-edges;" src="/img/${block_hash}" width="500">`).join('\n')
        }
    `;
});

app
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('Listening on http://localhost:%d/', PORT);
