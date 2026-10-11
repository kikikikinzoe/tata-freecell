const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
function buildWidgetHTML(){
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');
  const bridge=fs.readFileSync(path.join(root,'bridge.js'),'utf8');
  html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`);
  html=html.replace('<script src="./engine.js"></script>',`<script>${engine}</script>`);
  html=html.replace('<script src="./ui.js"></script>',`<script>${ui}</script>`);
  html=html.replace('<script src="./bridge.js"></script>',`<script>${bridge}</script>`);
  return html;
}
module.exports={buildWidgetHTML};
