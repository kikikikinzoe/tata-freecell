# 塔塔的空当接龙 ♡

一款适配手机的真正可玩 FreeCell 空当接龙，以及可作为 ChatGPT 自定义 MCP 插件连接的服务。牌面采用奶油色、鼠尾草绿和小花点缀。

## 功能

- 标准 52 张牌、8 列牌阵、4 个空当、4 个花色收牌区
- 红黑交错递减、多张牌连移（遵守空当/空列容量限制）
- 手机点选操作：**点要移动的牌 → 点目标列或目标空当**
- 撤销、重做、提示、自动安全收牌、每日同局、随机新局
- 自动尝试保存牌局；客户端禁止网页存储时仍可正常游戏，但关闭后不保证保留
- 完全自包含、无远程图片或字体的 MCP UI HTML，约 28 KB，减少模板资源获取问题

## 先玩网页版（无须安装）

直接在浏览器打开 `freecell-standalone.html`。这是完整游戏，只需一个 HTML 文件，不需要联网。

或者安装 Node.js 20+ 后，在项目根目录执行：

```bash
npm install
npm start
```

打开 `http://localhost:3000/game/` 即可在浏览器试玩。

## 把源码放到 GitHub

1. 创建一个 GitHub 仓库，比如 `tata-freecell`。
2. 上传本项目所有源码（不要上传 `node_modules` 或 `.env`）。
3. GitHub 只存放代码；**GitHub Pages 不提供 MCP 后端服务**。如需 ChatGPT 内的插件卡片，还须执行下一步部署。

## 部署 MCP 服务

示例采用 Render：创建一个连接 GitHub 仓库的 Web Service。可以选择仓库里的 `render.yaml` 作为部署配置；或者手动填写 `npm install` 作为 Build Command、`npm start` 作为 Start Command，Node.js 20+。以实际平台提供的套餐和可用区域为准。

部署成功后会有 HTTPS 地址，以下地址仅为 **示例**，不是现成的可访问服务：

- `https://YOUR-APP.onrender.com/health`：健康检查（返回 JSON）
- `https://YOUR-APP.onrender.com/game/`：手机网页游戏
- `https://YOUR-APP.onrender.com/mcp`：ChatGPT 插件连接地址（Streamable HTTP）

也可部署到任何支持 Node.js 20+、公网 HTTPS 的服务。

## 接入 ChatGPT

1. 在 ChatGPT 的 **Plugins（插件）** 中选择添加自定义 MCP 服务器（具体入口随账号/平台变化）。
2. 填写 `https://YOUR-APP.onrender.com/mcp`，将插件命名为「塔塔的空当接龙」。
3. 选择无需账号授权的连接（当前示例只有公开、只读的开局工具，不保存用户个人数据）。扫描工具，检查是否出现 `play_freecell`，然后完成创建与安装。
4. 在聊天里 @ 插件，说「来一局空当接龙」。
5. 如果出现 `Failed to fetch template`，优先检查服务器日志，以及 MCP `resources/read` 是否返回 `ui://tata-freecell/v1/game.html` 对应的 HTML，MIME 类型须为 `text/html;profile=mcp-app`。

> **移动端重要说明**：截至本项目制作时，OpenAI 的自定义 MCP Apps 官方帮助文档将测试支持列为 **ChatGPT 网页版**，未保证安卓 ChatGPT App 支持自建交互式卡片。即使 MCP 工具注册成功，也不能保证手机原生 App 能渲染。浏览器里的 `/game/` 是已准备好的移动端备用路径。

## 项目结构

```text
public/index.html   网页游戏布局
public/style.css    牌桌样式
public/engine.js    规则与牌局算法（独立可测）
public/ui.js        点牌交互、存档、撤销/重做、提示
lib/bundle.cjs      将 CSS/JS 合成单文件 MCP UI 资源
server.mjs          MCP 服务器、可玩网页、健康检查
render.yaml         部署平台示例配置
test/               Node 内置测试
freecell-standalone.html  单文件可玩的游戏
```

本地规则测试：

```bash
npm test
npm run build:standalone
```

服务提供 `play_freecell` 工具和 `ui://tata-freecell/v1/game.html` 资源；资源 MIME 类型为 `text/html;profile=mcp-app`，同时声明 `_meta.ui.resourceUri`、`openai/outputTemplate`。

## 局限

- GitHub 连接或 Render 发布需要账户持有人授权；单有源码不代表已部署和安装。
- 后端 MCP HTTP 与 ChatGPT 安卓原生卡片效果须在正式公网部署后做端到端测试。
- 牌组容量遵循 FreeCell 常见 supermove 规则；「提示」提供一个合法的当前移动，不保证是最佳解。
- 本插件不读取用户的聊天内容、不访问邮箱、不存储服务器端牌局。

参考：
- https://github.com/modelcontextprotocol/ext-apps
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
