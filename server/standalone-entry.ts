/**
 * 后端服务器打包入口
 * 
 * 用于 ncc 打包成独立的 server.js
 */

import { createServerWithWebSocket } from './app';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
// 在打包后，__dirname 指向 dist-package/backend/
// .env 文件在 dist-package/.env
const envPath = path.join(__dirname, '..', '.env');
console.log('加载环境变量:', envPath);
dotenv.config({ path: envPath });

// 验证关键环境变量
console.log('ZHIPU_API_KEY:', process.env.ZHIPU_API_KEY ? '已设置' : '未设置');

const PORT = 3001;
const HOST = 'localhost';

console.log('========================================');
console.log('   ExcelMind AI 后端服务器');
console.log('========================================');
console.log('');

const { app, server, wss } = createServerWithWebSocket();

server.listen(PORT, HOST, () => {
    console.log('✅ 后端服务器已启动');
    console.log(`   地址: http://${HOST}:${PORT}`);
    console.log(`   WebSocket: ws://${HOST}:${PORT}/api/v2/stream`);
    console.log('');
    console.log('⚠️  请勿关闭此窗口，否则后端服务将停止');
    console.log('========================================');
    console.log('');
});

// 优雅关闭
const shutdown = () => {
    console.log('');
    console.log('正在关闭服务器...');

    if (wss) {
        wss.clients.forEach((client) => client.close());
        wss.close();
    }

    server.close(() => {
        console.log('✅ 服务器已停止');
        process.exit(0);
    });

    // 强制退出（如果10秒后还没关闭）
    setTimeout(() => {
        console.error('强制退出');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    shutdown();
});
