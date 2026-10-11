/** Cloudflare Workers edition of 塔塔的空当接龙.
 * Stateless MCP Streamable HTTP endpoint + the existing standalone FreeCell game.
 * No runtime npm dependencies, database, cookies, account details, or external assets.
 * NOTE: worker.mjs is the deployed entrypoint; server.mjs is the alternative Node host.
 */
import gameHTML from './freecell-standalone.html';

const NAME = '塔塔的空当接龙';
const VERSION = '1.1.0';
const UI_URI = 'ui://tata-freecell/v1/game.html';
const MIME = 'text/html;profile=mcp-app';
const TOOL = {
  name: 'play_freecell',
  title: NAME,
  description: '在当前聊天中打开可玩的空当接龙 FreeCell：四个暂存位、四个收牌区、八列牌、撤销、重做、提示、每日挑战。',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: {
    ui: { resourceUri: UI_URI },
    'openai/outputTemplate': UI_URI,
    'openai/widgetDescription': '可触控的空当接龙牌桌',
  },
};
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Authorization',
  'access-control-expose-headers': 'Mcp-Protocol-Version',
  'cache-control': 'no-store',
};
const obj = (value, status=200) => new Response(JSON.stringify(value), {
  status, headers: { ...CORS, 'content-type':'application/json; charset=utf-8' },
});
const err = (id, code, message) => ({ jsonrpc:'2.0', id, error:{code,message} });
const ok = (id, result) => ({ jsonrpc:'2.0', id, result });

function rpc(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return err(null,-32600,'Invalid Request');
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') return err(message.id ?? null,-32600,'Invalid Request');
  // MCP notifications do not receive JSON-RPC responses.
  if (!Object.hasOwn(message,'id')) return null;
  const id = message.id;
  const params = message.params || {};
  switch(message.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged:false }, resources: { subscribe:false, listChanged:false } },
        serverInfo: { name:'tata-freecell', version:VERSION, title:NAME },
        instructions:'调用 play_freecell 打开游戏。UI 也可通过 /game/ 在手机浏览器直接使用。',
      });
    case 'ping': return ok(id,{});
    case 'tools/list': return ok(id,{tools:[TOOL]});
    case 'tools/call':
      if (params.name !== 'play_freecell') return err(id,-32602,'Unknown tool');
      return ok(id,{
        content:[{type:'text',text:'塔塔的空当接龙已准备好。点击牌再点击目标位置即可移动；支持撤销、重做和每日挑战。如聊天内不显示牌桌，请打开服务的 /game/ 页面。'}],
        structuredContent:{name:NAME,version:VERSION,mode:'interactive'},
        isError:false,
      });
    case 'resources/list':
      return ok(id,{resources:[{uri:UI_URI,name:'FreeCell game interface',title:NAME,mimeType:MIME,description:'完整可互动的单文件牌桌 UI'}]});
    case 'resources/read':
      if (params.uri !== UI_URI) return err(id,-32602,'Unknown resource');
      return ok(id,{contents:[{uri:UI_URI,mimeType:MIME,text:gameHTML,_meta:{ui:{prefersBorder:false}}}]});
    case 'prompts/list': return ok(id,{prompts:[]});
    default: return err(id,-32601,'Method not found');
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:CORS});
    if (request.method === 'GET' && pathname === '/health')
      return obj({ok:true,version:VERSION,platform:'cloudflare-workers',templateBytes:new TextEncoder().encode(gameHTML).length});
    if (request.method === 'GET' && (pathname === '/' || pathname === '/game' || pathname === '/game/' || pathname === '/game/index.html'))
      return new Response(gameHTML,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
    if (pathname === '/mcp' && request.method === 'POST') {
      let input;
      try {
        if (Number(request.headers.get('content-length') || 0) > 1024*1024) return obj(err(null,-32700,'Request too large'),413);
        input = await request.json();
      } catch { return obj(err(null,-32700,'Parse error'),400); }
      const messages = Array.isArray(input) ? input.map(rpc).filter(Boolean) : [rpc(input)].filter(Boolean);
      if (!messages.length) return new Response(null,{status:202,headers:CORS});
      return obj(Array.isArray(input)?messages:messages[0],200);
    }
    if (pathname === '/mcp') return new Response('Use MCP POST',{status:405,headers:{...CORS,Allow:'POST'}});
    return new Response('Not found',{status:404,headers:CORS});
  },
};
