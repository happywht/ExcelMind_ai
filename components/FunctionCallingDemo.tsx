/**
 * Function Calling React 集成示例
 * Phase 2 Week 0 技术验证
 *
 * 功能：演示如何在React组件中使用Function Calling
 */

import React, { useState, useRef, useEffect } from 'react';
import { ToolRegistry } from '../services/functionCalling/ToolRegistry';
import { FunctionCallingAdapter } from '../services/functionCalling/FunctionCallingAdapter';
import { prototypeTools } from '../services/functionCalling/tools';
import {
  Message,
  ExecutionResult,
  ToolCall
} from '../services/functionCalling/types';

interface FunctionCallingDemoProps {
  apiKey?: string;
}

export const FunctionCallingDemo: React.FC<FunctionCallingDemoProps> = ({
  apiKey = process.env.ZHIPU_API_KEY || ''
}) => {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExecutionResult | null>(null);

  // 引用
  const adapterRef = useRef<FunctionCallingAdapter | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化适配器
  useEffect(() => {
    const registry = new ToolRegistry();
    registry.registerBatch(prototypeTools);

    adapterRef.current = new FunctionCallingAdapter(
      apiKey,
      registry,
      {
        maxDepth: 2,
        maxToolsPerTurn: 3,
        timeout: 30000,
        enableParallel: true
      }
    );

    // 添加欢迎消息
    setMessages([
      {
        role: 'assistant',
        content: '你好！我是ExcelMind AI助手。我可以帮你：\n\n' +
          '• 📊 分析Excel文件结构\n' +
          '• 🔍 检测数据异常\n' +
          '• 📝 填充Word文档\n\n' +
          '请告诉我你需要什么帮助？'
      }
    ]);
  }, [apiKey]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading || !adapterRef.current) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await adapterRef.current.execute(
        input,
        { history: messages }
      );

      setCurrentResult(result);

      // 添加AI回复
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.finalResponse
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 如果有工具调用，显示工具使用信息
      if (result.toolCalls.length > 0) {
        const toolInfo: Message = {
          role: 'assistant',
          content: `\n📋 使用了 ${result.toolCalls.length} 个工具:\n` +
            result.toolCalls.map(call =>
              `• ${call.name}`
            ).join('\n')
        };
        setMessages(prev => [...prev, toolInfo]);
      }

    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 渲染消息
  const renderMessage = (msg: Message, index: number) => {
    const isUser = msg.role === 'user';
    const bgColor = isUser ? 'bg-blue-500' : 'bg-gray-700';
    const align = isUser ? 'justify-end' : 'justify-start';

    return (
      <div key={index} className={`flex ${align} mb-4`}>
        <div className={`${bgColor} text-white px-4 py-2 rounded-lg max-w-[80%]`}>
          <div className="whitespace-pre-wrap">{msg.content}</div>
        </div>
      </div>
    );
  };

  // 渲染工具调用详情
  const renderToolCalls = () => {
    if (!currentResult || currentResult.toolCalls.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">🔧 工具调用详情</h3>

        {currentResult.toolCalls.map((call, index) => (
          <div key={index} className="mb-2 p-2 bg-white rounded">
            <div className="font-semibold">{call.name}</div>
            <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
          </div>
        ))}

        {currentResult.toolResults.length > 0 && (
          <div className="mt-2">
            <h4 className="font-semibold mb-1">执行结果:</h4>
            {currentResult.toolResults.map((result, index) => (
              <div key={index} className="text-xs bg-green-50 p-2 rounded">
                {result.error ? (
                  <span className="text-red-600">❌ {result.error}</span>
                ) : (
                  <span>✅ 成功</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-600">
          迭代次数: {currentResult.iterations} | 成功: {currentResult.success ? '是' : '否'}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* 标题 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Function Calling 原型演示</h1>
        <p className="text-gray-600">Phase 2 Week 0 技术验证</p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
        {messages.map((msg, index) => renderMessage(msg, index))}
        <div ref={messagesEndRef} />
      </div>

      {/* 工具调用详情 */}
      {renderToolCalls()}

      {/* 输入区域 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入你的问题..."
          disabled={loading}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? '发送中...' : '发送'}
        </button>
      </div>

      {/* 示例提示 */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">💡 试试这些问题:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <button
            onClick={() => setInput('分析test.xlsx文件的结构')}
            className="p-2 bg-white rounded hover:bg-gray-50 text-left"
          >
            分析test.xlsx文件的结构
          </button>
          <button
            onClick={() => setInput('检查Excel里有没有超过5000元的异常记录')}
            className="p-2 bg-white rounded hover:bg-gray-50 text-left"
          >
            检查超过5000元的异常记录
          </button>
          <button
            onClick={() => setInput('用data.xlsx填充template.docx生成文档')}
            className="p-2 bg-white rounded hover:bg-gray-50 text-left"
          >
            生成填充文档
          </button>
        </div>
      </div>
    </div>
  );
};

export default FunctionCallingDemo;
