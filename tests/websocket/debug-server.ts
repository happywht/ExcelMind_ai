/**
 * 调试WebSocket服务器启动问题
 */

console.log('开始调试...');

try {
  console.log('1. 导入WebSocketServer...');
  const { WebSocketServer } = await import('../../server/websocket/websocketServer');
  console.log('   ✅ 导入成功');

  console.log('2. 创建服务器实例...');
  const server = new WebSocketServer(3001);
  console.log('   ✅ 实例创建成功');
  console.log('   配置端口:', server instanceof Object);

  console.log('3. 启动服务器...');
  const startTime = Date.now();

  // 添加超时
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('启动超时(10秒)')), 10000);
  });

  await Promise.race([
    server.start(),
    timeoutPromise
  ]);

  const elapsed = Date.now() - startTime;
  console.log(`   ✅ 服务器启动成功 (耗时: ${elapsed}ms)`);

  console.log('4. 等待3秒...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('5. 关闭服务器...');
  await server.stop();
  console.log('   ✅ 服务器已关闭');

  process.exit(0);

} catch (error) {
  console.error('❌ 错误:', error);
  console.error('   错误堆栈:', error.stack);
  process.exit(1);
}
