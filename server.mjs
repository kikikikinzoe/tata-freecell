/** Stateless MCP Streamable HTTP server + self-contained game UI resource. */
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bundler from './lib/bundle.cjs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';

const PORT=Number(process.env.PORT || 3000);
const ROOT=path.dirname(fileURLToPath(import.meta.url));
// Change this URI when making breaking UI changes, preventing stale template caches.
const UI_URI='ui://tata-freecell/v1/game.html';
const VERSION='1.0.0';

function createMcpServer(){
  const server=new McpServer({name:'tata-freecell',version:VERSION});
  registerAppTool(server,'play_freecell',{
    title:'塔塔的空当接龙',
    description:'在当前聊天中打开真正可玩的空当接龙 FreeCell 游戏。显示触控牌桌，可移动牌、撤销、重做、提示、每日挑战。用户说玩空当接龙或开新局时使用。',
    inputSchema:{},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    _meta:{ui:{resourceUri:UI_URI},'openai/outputTemplate':UI_URI,'openai/widgetDescription':'空当接龙的可玩交互牌桌'},
  },async()=>({
    content:[{type:'text',text:'空当接龙已打开：4个暂存位、4个收牌区、8列纸牌。点一张牌，再点目标位置移动；也能撤销、提示和每日挑战。如果当前客户端无法显示交互 UI，可在网页试玩版继续。'}],
    structuredContent:{name:'塔塔的空当接龙',version:VERSION,mode:'interactive'},
  }));
  registerAppResource(server,'FreeCell game interface',UI_URI,
    {mimeType:RESOURCE_MIME_TYPE},async()=>({contents:[{
      uri:UI_URI,mimeType:RESOURCE_MIME_TYPE,text:bundler.buildWidgetHTML(),
      _meta:{ui:{prefersBorder:false}},
    }]}));
  return server;
}

const app=express();
app.disable('x-powered-by');
app.use(cors({origin:'*',methods:['GET','POST','OPTIONS','DELETE'],allowedHeaders:['Content-Type','Accept','Mcp-Session-Id','Mcp-Protocol-Version','Authorization'],exposedHeaders:['Mcp-Session-Id','Mcp-Protocol-Version']}));
app.use(express.json({limit:'1mb'}));
app.get('/health',(_req,res)=>res.json({ok:true,version:VERSION,templateBytes:Buffer.byteLength(bundler.buildWidgetHTML())}));
app.get('/',(_req,res)=>res.redirect('/game/'));
app.use('/game',express.static(path.join(ROOT,'public'),{index:'index.html',maxAge:'1h'}));
app.post('/mcp',async(req,res)=>{
  const server=createMcpServer();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
  let closed=false;
  res.on('close',async()=>{ if(closed)return;closed=true;await transport.close().catch(()=>{});await server.close().catch(()=>{}); });
  try{await server.connect(transport);await transport.handleRequest(req,res,req.body);}
  catch(err){
    console.error('MCP error:',err);
    if(!res.headersSent)res.status(500).json({jsonrpc:'2.0',error:{code:-32603,message:'Internal server error'},id:null});
  }
});
// Stateless Streamable HTTP doesn't provide SSE or session deletion.
app.get('/mcp',(_req,res)=>res.status(405).set('Allow','POST').send('Use MCP POST'));
app.delete('/mcp',(_req,res)=>res.status(405).set('Allow','POST').send('Stateless server'));
app.listen(PORT,'0.0.0.0',()=>console.log(`FreeCell MCP listening on 0.0.0.0:${PORT}  (/mcp)`));
