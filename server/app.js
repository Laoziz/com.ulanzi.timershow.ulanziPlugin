const Koa = require('koa');
const WebSocket = require('ws');
const Router = require('koa-router');
const views =require('koa-views');
const cors = require('koa2-cors');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const app = new Koa();
const router = new Router();

const UUID="com.ulanzi.ulanzideck.timer";
const port=3910;
app.use(views(__dirname+'/views', { extension: 'ejs' }));
app.use(router.routes());
app.use(router.allowedMethods());
app.use(cors({  
    origin: function (ctx) {  
      // 动态判断哪些源被允许访问  
      // 这里返回允许的源（可以是字符串或者返回字符串的函数）  
      // 如果不允许则返回 false 或者不返回任何东西  
    //   if (ctx.url === '/some-special-path') {  
    //     return 'http://example.com';  
    //   }  
      return '*'; // 允许所有源  
    },  
    maxAge: 86400, // 缓存预检请求的结果（以秒为单位）  
    credentials: true, // 允许携带凭证（cookies, HTTP认证及客户端SSL证明等）  
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许请求的方法  
    allowHeaders: ['Content-Type', 'X-Requested-With', 'accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'], // 允许请求的头部  
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'] // 暴露给前端（浏览器）的头部  
  }));

var arguments = process.argv.splice(2);
var params1 = arguments[0];
var params2 = arguments[1];
var params3 = arguments[2];
var params4 = arguments[3];

const appDataPath = process.env.APPDATA;
// var dirPath = os.homedir() + '/AppData/Roaming/Ulanzi/UlanziDeck/Plugins/com.ulanzi.timershow.ulanziPlugin/server/';
var dirPath = appDataPath + '/Ulanzi/UlanziDeck/Plugins/com.ulanzi.timershow.ulanziPlugin/server/';
var upWebConnect=null;
var params = {
    mode: 'countdown',
    repeat: 0,
    operate: 0,
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

router.get('/update', function(ctx) {
    var query = ctx.query;
    var json = {
        'second': parseInt(params.second),
        'repeat': parseInt(params.repeat),
    };
    var str='';
    if (!!query.second) {
        params.second=query.second;
        json.second=parseInt(query.second);
        str = updateJsonFile(json);
    } else if (!!query.mode) {
        params.mode=query.mode;
    } else if (!!query.operate) {
        params.operate=query.operate;
    } else if(!!query.repeat) {
        params.repeat=query.repeat;
        json.repeat=parseInt(query.repeat);
        str = updateJsonFile(json);
    }
    fs.appendFile(dirPath + '/log', JSON.stringify(json), (err)=>{
        if (!!err) {
            console.error('Error writing file:', err.message); 
        } else {
            console.log('Successfully wrote JSON data to data.json'); 
        }
    });
    ctx.body = {
        appDataPath,
        dirPath,
        process: params1 + ','+params2 + ','+params3 + ','+params4
    };
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

function updateJsonFile(json) {
    const jsonData = JSON.stringify(json, null, 2);
    var str = '';
    try {
        fs.writeFileSync(dirPath + '/local/local.json', jsonData);
        // openExe();
    } catch(err) {
        str = JSON.stringify(err);
    }
    return str;
}

function openExe() {
    execFile(dirPath + '/local/countdown.exe', (error, stdout, stderr) => {
        if (error) {

            console.log('open exe error:', JSON.stringify(error));
            return;
        }
        console.log(stdout);
    });
}

function parseCmd(data){
    const {cmd, uuid, key, param={}} = data;
    console.log('parseCmd:', JSON.stringify(data));
    if (cmd == "add") {
        currentKey = key;
        const json={
            code: 0,
            cmd: "add",
            uuid,
            key,
        }
        upWebConnect.send(JSON.stringify(json));
    }
    if (cmd == "paramfromapp") {
        const data1 = param;
        console.log("paramfromapp:", data1);
    }
    if (cmd == "run") {
        openExe();
    }
    if (cmd == "setactive") {
        console.log("setactive:");
    }
    if (cmd == "state") {
        console.log("state:");
    }
    if (cmd == "paramfromplugin") {
        console.log("paramfromplugin:");
    }
    if (cmd == "paramfromapp") {
        console.log("paramfromapp:");
    }
    if (cmd == "clear") {
        console.log("clear:");
        upWebConnect.close();
    }
}

function connectToUpServer(){
    var url = 'ws://127.0.0.1:3906';
    if (!!params1 && !!params2) {
        url = 'ws://' + params1 + ':' + params2;
    }

    console.log('connectToUpServer:ws://172.0.0.1:3906');
    upWebConnect=new WebSocket(url);
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
                parseCmd(message);
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