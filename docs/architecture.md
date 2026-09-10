# 架构

默认统一模式：一个 Express 进程。

```text
浏览器 :3338
  ├── /applications/pwa/*     Client dist/Web
  ├── /data/*                 本地文件 → DATA_OVERRIDE_PATH → GRF
  ├── /ws/<host:port>         WebSocket → rAthena TCP
  ├── rAthena Web API 代理    → web-server :8889
  └── /api/adventure-tools    → Admin API
```

查找实现见 `src/controllers/clientController.js`。代理见 `src/middlewares/httpProxyMiddleware.js` 与根目录 `index.js`。
