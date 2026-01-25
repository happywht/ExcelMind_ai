/**
 * SQL Editor Component
 * 基于Monaco Editor的SQL编辑器组件
 */

import React, { useRef, useEffect, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import type { SQLEditorProps } from './types';

export const SQLEditor: React.FC<SQLEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  language = 'sql',
  theme = 'vs-light',
  options = {},
  onEditorDidMount,
  onEditorWillMount,
  onEditorChange,
  height = '400px',
  width = '100%'
}) => {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  /**
   * 默认编辑器选项
   */
  const defaultOptions = {
    minimun: 1,
    maximun: 1000,
    readOnly,
    automaticLayout: true,
    fontSize: 14,
    lineHeight: 24,
    lineNumbers: 'on' as const,
    scrollbar: {
      useShadows: false,
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
      verticalHasArrows: false,
      horizontalHasArrows: false,
    },
    minimap: { enabled: true },
    folding: true,
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: 'beforeWhitespace' as const,
    autoClosingQuotes: 'beforeWhitespace' as const,
    tabSize: 2,
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
    cursorStyle: 'line' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    smoothScrolling: true,
    renderWhitespace: 'selection' as const,
    contextmenu: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'on' as const,
    tabCompletion: 'on' as const,
    wordBasedSuggestions: true,
    parameterHints: {
      enabled: true,
    },
    formatOnPaste: true,
    formatOnType: true,
    ...options,
  };

  /**
   * 编辑器挂载回调
   */
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // 注册SQL自定义语言功能
    if (monaco) {
      setupSQLLanguage(monaco);
    }

    // 触发外部回调
    if (onEditorDidMount) {
      onEditorDidMount(editor);
    }

    // 设置编辑器快捷键
    setupShortcuts(editor, monaco);
  };

  /**
   * 编辑器卸载前回调
   */
  const handleEditorWillMount = (monaco: Monaco) => {
    if (onEditorWillMount) {
      onEditorWillMount();
    }
  };

  /**
   * 编辑器内容变化回调
   */
  const handleEditorChange = (newValue: string | undefined) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }

    if (onEditorChange) {
      onEditorChange(newValue);
    }
  };

  /**
   * 设置SQL语言特性
   */
  const setupSQLLanguage = (monaco: Monaco) => {
    // 注册自动完成提供者
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // SQL关键字建议
        const suggestions = [
          // 关键字
          { label: 'SELECT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'SELECT ' },
          { label: 'FROM', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'FROM ' },
          { label: 'WHERE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'WHERE ' },
          { label: 'JOIN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'JOIN ' },
          { label: 'LEFT JOIN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'LEFT JOIN ' },
          { label: 'RIGHT JOIN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'RIGHT JOIN ' },
          { label: 'INNER JOIN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'INNER JOIN ' },
          { label: 'ON', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ON ' },
          { label: 'AND', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'AND ' },
          { label: 'OR', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'OR ' },
          { label: 'NOT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'NOT ' },
          { label: 'IN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'IN ()' },
          { label: 'LIKE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'LIKE ' },
          { label: 'BETWEEN', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'BETWEEN  AND ' },
          { label: 'IS NULL', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'IS NULL' },
          { label: 'IS NOT NULL', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'IS NOT NULL' },
          { label: 'ORDER BY', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ORDER BY ' },
          { label: 'GROUP BY', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'GROUP BY ' },
          { label: 'HAVING', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'HAVING ' },
          { label: 'LIMIT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'LIMIT ' },
          { label: 'OFFSET', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'OFFSET ' },
          { label: 'ASC', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ASC' },
          { label: 'DESC', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'DESC' },

          // 聚合函数
          { label: 'COUNT', kind: monaco.languages.CompletionItemKind.Function, insertText: 'COUNT(*)' },
          { label: 'SUM', kind: monaco.languages.CompletionItemKind.Function, insertText: 'SUM()' },
          { label: 'AVG', kind: monaco.languages.CompletionItemKind.Function, insertText: 'AVG()' },
          { label: 'MIN', kind: monaco.languages.CompletionItemKind.Function, insertText: 'MIN()' },
          { label: 'MAX', kind: monaco.languages.CompletionItemKind.Function, insertText: 'MAX()' },

          // 其他关键字
          { label: 'DISTINCT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'DISTINCT ' },
          { label: 'UNION', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'UNION ' },
          { label: 'UNION ALL', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'UNION ALL ' },
          { label: 'CASE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'CASE WHEN  THEN  ELSE  END' },
          { label: 'EXISTS', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'EXISTS ' },
          { label: 'AS', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'AS ' },

          // INSERT/UPDATE/DELETE
          { label: 'INSERT INTO', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'INSERT INTO  VALUES ()' },
          { label: 'UPDATE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'UPDATE  SET ' },
          { label: 'DELETE FROM', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'DELETE FROM ' },

          // DDL
          { label: 'CREATE TABLE', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'CREATE TABLE  (\n\t\n)' },
          { label: 'ALTER TABLE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ALTER TABLE ' },
          { label: 'DROP TABLE', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'DROP TABLE ' },
        ];

        return { suggestions: suggestions.map(s => ({ ...s, range })) };
      },
    });

    // 注册括号自动配对
    monaco.languages.registerLanguageConfiguration('sql', {
      brackets: [
        ['(', ')'],
        ['[', ']'],
        ['{', '}'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string'] },
        { open: '`', close: '`', notIn: ['string'] },
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
      ],
      folding: {
        markers: {
          start: /^\s*--\s*#region/,
          end: /^\s*--\s*#endregion/,
        },
      },
    });
  };

  /**
   * 设置编辑器快捷键
   */
  const setupShortcuts = (editor: any, monaco: Monaco) => {
    // Ctrl/Cmd + S: 保存
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // 保存事件会通过props传递
      const event = new CustomEvent('sql-editor-save', { detail: { value: editor.getValue() } });
      window.dispatchEvent(event);
    });

    // Ctrl/Cmd + Enter: 执行
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const event = new CustomEvent('sql-editor-execute', { detail: { value: editor.getValue() } });
      window.dispatchEvent(event);
    });

    // Ctrl/Cmd + Shift + F: 格式化
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.trigger('', 'editor.action.formatDocument', {});
    });

    // Ctrl/Cmd + /: 注释
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.trigger('', 'editor.action.commentLine', {});
    });

    // Ctrl/Cmd + D: 选择相同词的下一个出现位置
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.trigger('', 'editor.action.addSelectionToNextFindMatch', {});
    });
  };

  /**
   * 格式化代码
   */
  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  /**
   * 获取编辑器实例
   */
  const getEditor = () => {
    return editorRef.current;
  };

  /**
   * 暴露格式化方法到window对象（用于外部调用）
   */
  useEffect(() => {
    if (isEditorReady) {
      (window as any).sqlEditorFormat = formatCode;
      (window as any).sqlEditorGet = getEditor;
    }

    return () => {
      delete (window as any).sqlEditorFormat;
      delete (window as any).sqlEditorGet;
    };
  }, [isEditorReady]);

  return (
    <div className="sql-editor-wrapper relative rounded-lg overflow-hidden border border-slate-200">
      <Editor
        height={height}
        width={width}
        language={language}
        theme={theme}
        value={value}
        onChange={handleEditorChange}
        options={defaultOptions as any}
        onMount={handleEditorDidMount}
        beforeMount={handleEditorWillMount}
        loading={
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500">加载编辑器...</span>
            </div>
          </div>
        }
      />

      {/* 编辑器状态指示器 */}
      {isEditorReady && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-white/90 backdrop-blur rounded-md shadow-sm border border-slate-200">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-slate-600 font-medium">SQL Mode</span>
        </div>
      )}
    </div>
  );
};

export default SQLEditor;
