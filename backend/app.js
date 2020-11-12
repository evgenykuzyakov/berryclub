const { connect, Account, keyStores: { InMemoryKeyStore } } = require('near-api-js');

async function viewPixelBoard() {
    const config = require('./config')(process.env.NODE_ENV || 'development')
    // TODO: Why no default keyStore?
    const keyStore = new InMemoryKeyStore();
    const near = await connect({...config, keyStore});
    const account = await near.account('berryclub.ek.near');
    const pixelsState = await account.viewState('p', { blockId: 22257601 });
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

app.use(async ctx => {
    ctx.type = "image/png";
    ctx.body = await viewPixelBoard();
});

app.listen(3000);
