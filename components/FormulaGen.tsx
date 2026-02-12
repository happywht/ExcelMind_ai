import React, { useState } from 'react';
import { Copy, Check, Sparkles, ArrowRight } from 'lucide-react';
import { generateExcelFormula } from '../services/zhipuService';

export const FormulaGen: React.FC = () => {
  const [input, setInput] = useState('');
  const [formula, setFormula] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 常用公式示例
  const formulaExamples = [
    { name: '条件判断', formula: '如果A1大于100显示"高"，否则显示"低"' },
    { name: '查找匹配', formula: '在B列查找A1的值，返回C列对应的数据' },
    { name: '条件求和', formula: '对A列中大于0的数值求和' },
    { name: '字符串拼接', formula: '将A列和B列的文本连接在一起' },
    { name: '日期计算', formula: '计算两个日期之间的天数差' },
    { name: '数据验证', formula: '检查A1是否为空，为空显示0，否则显示值' }
  ];

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setFormula('');

    try {
      const result = await generateExcelFormula(input);
      if (result === '生成公式失败' || result === '=ERROR()') {
        setError('公式生成失败，请尝试更详细的描述');
      } else {
        setFormula(result);
      }
    } catch (err: any) {
      console.error('Formula generation error:', err);
      setError(`生成错误: ${err.message}`);
    }

    setLoading(false);
  };

  const handleExampleClick = (example: { name: string; formula: string }) => {
    setInput(example.formula);
    setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Excel 公式生成器</h2>
        <p className="text-slate-500">用自然语言描述您的计算需求，立即获取 Excel 公式。</p>
      </div>

      {/* 快速示例 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">快速示例</h3>
        <div className="flex flex-wrap gap-2">
          {formulaExamples.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-slate-600"
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-stretch">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            描述您的需求
          </label>
          <textarea
            className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all text-slate-700"
            placeholder="例如：如果 A 列大于 100，则显示'高'，否则显示'低'。"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !input}
            className={`mt-4 w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
              loading || !input
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">正在生成...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成公式
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <label className="block text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
            生成结果
          </label>
          
          <div className="flex-1 flex items-center justify-center">
            {error ? (
              <div className="w-full">
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-red-300">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : formula ? (
              <div className="w-full">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 backdrop-blur-sm relative group">
                  <code className="text-emerald-400 text-xl font-mono break-all block">
                    {formula}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="复制到剪贴板"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* 公式说明 */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    💡 提示：复制公式后，在Excel中选择目标单元格并粘贴
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-600">
                <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>准备就绪</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};