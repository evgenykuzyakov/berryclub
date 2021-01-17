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
    const scale = 8;
    const canvas = createCanvas(50 * scale, 50 * scale);
    const ctx = canvas.getContext('2d');
    lines.forEach((line, y) => {
        line.forEach((color, x) => {
            ctx.fillStyle = `#${color}`;
            ctx.fillRect(x * scale, y * scale, scale, scale);
        });
    });

    return canvas.toBuffer();
}


const Koa = require('koa');
const app = new Koa();

const Router = require('koa-router');
const router = new Router();

const SERVER_URL = 'https://wayback.berryclub.io';

router.get('/img/:blockId?', async ctx => {
    ctx.type = "image/png";
    ctx.body = await viewPixelBoard(ctx.params.blockId);
});

const oembed = require('koa-oembed');
router.get('/oembed', oembed(`${SERVER_URL}/board/*`), function (ctx) {
    const photoId = ctx.oembed.match[1] // regex match of first wildcard.
    // match[0] is the fully matched url; 1, 2, 3... store wildcard matches

    // TODO: Some generic validation
    // if (!checkIfExists(photoId)) {
    //     ctx.throw(404)
    // }

    ctx.oembed.photo({
        url: `https://wayback.berryclub.io/img/${photoId}`,
        width: 400,
        height: 400
    })
})

const commonStyles = `
    <style>
        p, img {
            max-width: 90vh;
            margin: 0.5em auto;
        }
        img {
            width: 100%;
            display: block;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
    </style>
`;

router.get('/board/:blockId?', async ctx => {
    const { blockId } = ctx.params;
    ctx.type = 'text/html';
    ctx.body = `
        ${commonStyles}

        <link rel="alternate" type="application/json+oembed"
  href="${SERVER_URL}/oembed?url=${encodeURIComponent(`${SERVER_URL}${ctx.url}`)}&format=json"
  title="Berry Club Snapshot" />

        <p>Made in <a href="https://berryclub.io">🥑 club</a>.

        <p><img src="/img/${blockId}">
    `;
});

router.get('/rate/:blockId1/vs/:blockId2', async ctx => {
    const { blockId1, blockId2 } = ctx.params;

    const board = blockId => `
        <div class="board">
            <img src="/img/${blockId}">
            <form method="POST">
                <button value="${blockId}">This 🍅 is juicier</button>
            </form>
        </div>
    `;

    ctx.type = 'text/html';
    ctx.body = `
        ${commonStyles}
        <style>
            img {
                width: 50vh;
            }

            .container {
                display: flex;
                justify-content: center;
            }

            .board {
                padding: 0.5em;
            }
        </style>

        <p>Which 🍅 is juicier?</p>

        <div class="container">
            ${board(blockId1)}
            ${board(blockId2)}
        </div>
    `;
});

const indexer = require('./indexer');
router.get('/:accountId?', async ctx => {
    const { accountId } = ctx.params;

    const edits = await indexer.findEdits(accountId);
    edits.sort((a, b) => parseFloat(a.block_timestamp) - parseFloat(b.block_timestamp));

    ctx.type = 'text/html';
    ctx.body = `
        ${commonStyles}

        <p>Welcome to <a href="https://berryclub.io">🥑 club</a> time machine.

        ${
            accountId
                ? `You are viewing sample of pictures where <a href="https://explorer.near.org/accounts/${accountId}">${accountId}</a> has contributed.` 
                : `You are viewing sample of pictures made by Berry Club users.`
        }
        <p>Refresh your browser to see a different sample.

        ${
            edits.map(({ block_hash }) => `<p><img src="/img/${block_hash}" width="500">`).join('\n')
        }
    `;
});

app
    .use(async (ctx, next) => {
        console.log(ctx.method, ctx.path);
        await next();
    })
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log('Listening on http://localhost:%d/', PORT);
