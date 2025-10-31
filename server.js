import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 启用CORS中间件，允许所有来源的请求
app.use(cors());

// --- 代理设置 ---
const apiTarget = 'http://127.0.0.1:7657';

// 代理所有 /api 请求到后端
app.use('/api', createProxyMiddleware({
  target: apiTarget,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    // 关键修复：确保将原始请求的协议（http或https）通过 X-Forwarded-Proto 头传递给后端。
    // 这使得后端（例如带有 ProxyHeadersMiddleware 的 FastAPI）在处理重定向时能够生成正确的URL，
    // 从而解决了在HTTPS环境下出现的“混合内容”错误。
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
  }
}));

// 代理WebSocket连接
const wsProxy = createProxyMiddleware({
    target: apiTarget,
    ws: true,
    logLevel: 'debug',
});
app.use('/socket.io', wsProxy);


// --- HTTPS/WSS Setup ---
let server;
let isHttps = false;
try {
  const key = fs.readFileSync(path.join(__dirname, 'certs', 'key.pem'));
  const cert = fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'));
  const options = { key, cert };
  server = https.createServer(options, app);
  isHttps = true;
  console.log("SSL certificates found. Starting in HTTPS/WSS mode.");
} catch (e) {
  console.warn('SSL certificates not found in ./certs directory. Starting in HTTP/WS mode. This is not suitable for production.');
  server = http.createServer(app);
}

// Socket.IO服务器现在直接挂载在已有的HTTP/S服务器上
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 8764;

const buildPath = path.join(__dirname, 'dist');

// 提供构建后的静态文件
app.use(express.static(buildPath));

// 对于所有其他GET请求，返回index.html，以支持客户端路由 (SPA)
app.get('/*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// Socket.IO连接处理逻辑
io.on('connection', (socket) => {
  console.log('A user connected via WebSocket:', socket.id);

  socket.on('join', (data) => {
    const room = data.room;
    if (room) {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 监听升级请求以手动处理WebSocket代理
server.on('upgrade', wsProxy.upgrade);


// 使用 server 实例 (either http or https) 来监听端口
server.listen(port, () => {
  console.log(`服务器正在监听端口 ${port}`);
  const protocol = isHttps ? 'https' : 'http';
  console.log(`服务地址: ${protocol}://localhost:${port}`);
});