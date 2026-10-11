/* Minimal MCP Apps 2026-01-26 iframe handshake; no remote scripts required.
 * The game also works in a normal browser without a host. */
(function () {
  'use strict';
  if (window.parent === window) return;
  const INIT_ID = 10241;
  let initialized = false;
  let oldWidth = -1, oldHeight = -1;
  function notify(method, params) {
    window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
  }
  function notifySize() {
    if (!initialized) return;
    const width = Math.ceil(document.documentElement.scrollWidth);
    const height = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
    if (width !== oldWidth || height !== oldHeight) {
      oldWidth = width; oldHeight = height;
      notify('ui/notifications/size-changed', { width, height });
    }
  }
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || !event.data || event.data.jsonrpc !== '2.0') return;
    const data = event.data;
    if (data.id === INIT_ID && data.result && !initialized) {
      initialized = true;
      notify('ui/notifications/initialized', {});
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(notifySize);
        resizeObserver.observe(document.documentElement);
        resizeObserver.observe(document.body);
      }
      notifySize();
    }
    if (data.method === 'ui/resource-teardown' && data.id !== undefined) {
      window.parent.postMessage({jsonrpc:'2.0',id:data.id,result:{}},'*');
    }
  });
  window.parent.postMessage({
    jsonrpc: '2.0', id: INIT_ID, method: 'ui/initialize',
    params: {
      protocolVersion: '2026-01-26',
      appInfo: { name: 'tata-freecell', version: '1.0.0' },
      appCapabilities: { availableDisplayModes: ['inline'] },
    },
  }, '*');
})();
