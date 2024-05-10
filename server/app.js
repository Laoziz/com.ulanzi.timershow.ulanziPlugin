const Koa = require('koa');
const WebSocket = require('ws');
const Router = require('koa-router');
const views =require('koa-views')
const app = new Koa();
const router = new Router();

const UUID="com.ulanzi.ulanzideck.timer.plugin";
const port=3910;
app.use(views(__dirname+'/views', { extension: 'ejs' }));
app.use(router.routes());
app.use(router.allowedMethods());

var upWebConnect=null;
var params = {
    mode: 'countdown',
    repeat: 0,
    operate: 'Open New Instance',
    second: 3,
    def: '00:03',
    uuid: UUID,
}

router.get('/run', async function(ctx) {
    var json = ctx.query;
    console.log(json);

    params.second=json.second||10;
    params.mode=json.mode||'countdown';
    params.operate=json.operate||'Open New Instance';
    params.repeat=json.repeat||1;

    var second=params.second;
    var min=Math.floor(second/60);
    var sec=second-(min*60);
    console.log('min*60:',min*60);
    console.log('second:',second);
    console.log('time min:',min,' sec:', sec);
    params.def = (min<10?'0'+min:min)+':'+(sec<10?'0'+sec:sec);
    console.log('time def:',params.def);
    await ctx.render('index', params);
});

router.get('/close', function(ctx){
    console.log('=========webclose==========');
    const json = {
        cmd:"closeview",
        "index": 0
    };
    upWebConnect.send(JSON.stringify(json));
});

app.listen(port, () => {
    console.log('listen '+port+' success');
});

function connectToUpServer(){
    console.log('connectToUpServer:ws://172.0.0.1:3906');
    upWebConnect=new WebSocket("ws://127.0.0.1:3906");
    upWebConnect.onopen=function(){
        const json = {
            code:0,
            cmd:"connected",
            uuid:UUID,
        };
        upWebConnect.send(JSON.stringify(json));
    }

    upWebConnect.onmessage=function(msg){
        try {
            if (!!msg.data) {
                const message = JSON.parse(msg.data);
                console.log('onmessage:', JSON.stringify(msg.data));
                console.log('onmessage:', msg.data);
                // parseCmd(message);
            }
        } catch(err) {
            alert(err.toString());
        }
        
    }

    upWebConnect.onerror=function(err){
        console.log(err.toString());
    }
    upWebConnect.onclose=function(evt){
        // var reason=WEBSOCKETERROT(evt);
        console.warn('reason',evt.toString());
    }
}

connectToUpServer();
module.exports = app;