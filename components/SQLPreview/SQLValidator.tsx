/**
 * SQL Validator Component
 * SQL语法验证组件
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, XCircle, CheckCircle2, Info, X, AlertOctagon } from 'lucide-react';
import type { SQLValidatorProps, ValidationResult, ValidationError } from './types';
import { SQLFormatter } from './SQLFormatter';

export const SQLValidator: React.FC<SQLValidatorProps> = ({
  sql,
  schema,
  onValidationChange,
  realTime = true,
  validationDelay = 500
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 执行验证
   */
  const validate = (sqlToValidate: string) => {
    setIsValidating(true);

    const result = SQLFormatter.validate(sqlToValidate);

    // 额外的Schema验证
    if (schema && schema.tables.length > 0) {
      const schemaErrors = validateAgainstSchema(sqlToValidate, schema);
      result.errors.push(...schemaErrors);
    }

    setValidationResult(result);
    setIsValidating(false);

    if (onValidationChange) {
      onValidationChange(result);
    }
  };

  /**
   * 针对数据库Schema进行验证
   */
  const validateAgainstSchema = (sqlText: string, dbSchema: typeof schema): ValidationError[] => {
    const errors: ValidationError[] = [];
    const upperSQL = sqlText.toUpperCase();

    // 提取表名
    const tableNames = SQLFormatter.extractTableNames(sqlText);

    // 验证表是否存在
    tableNames.forEach(tableName => {
      const tableExists = dbSchema!.tables.some(
        t => t.name.toUpperCase() === tableName.toUpperCase()
      );

      if (!tableExists) {
        errors.push({
          message: `表 "${tableName}" 不存在于数据库中`,
          severity: 'error',
          code: 'TABLE_NOT_FOUND'
        });
      }
    });

    // 提取列名（简单实现）
    const columnMatches = sqlText.match(/\bSELECT\s+([\s\S]+?)\s+FROM\b/i);
    if (columnMatches && columnMatches[1]) {
      const columns = columnMatches[1]
        .split(',')
        .map(col => col.trim().split(/\s+AS\s+/i)[0].replace(/`/g, '').replace(/"/g, ''));

      // 这里可以添加列存在性验证逻辑
      // 由于需要解析复杂的SQL语法，这里简化处理
    }

    return errors;
  };

  /**
   * 延迟验证
   */
  useEffect(() => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    if (!realTime || !sql.trim()) {
      return;
    }

    validationTimerRef.current = setTimeout(() => {
      validate(sql);
    }, validationDelay);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [sql, realTime]);

  /**
   * 手动触发验证
   */
  const handleManualValidate = () => {
    validate(sql);
  };

  /**
   * 获取问题总数
   */
  const getIssueCount = () => {
    return validationResult.errors.length + validationResult.warnings.length;
  };

  /**
   * 获取严重程度图标
   */
  const getSeverityIcon = (severity?: 'error' | 'warning' | 'critical' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'critical':
        return <AlertOctagon className="w-4 h-4 text-red-700 flex-shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    }
  };

  /**
   * 获取SQL类型标签
   */
  const getSQLTypeBadge = () => {
    if (!validationResult.sqlType || validationResult.sqlType === 'UNKNOWN') {
      return null;
    }

    const colors: Record<string, string> = {
      'SELECT': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'INSERT': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      'UPDATE': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'DELETE': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'CREATE': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'ALTER': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'DROP': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };

    const colorClass = colors[validationResult.sqlType] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {validationResult.sqlType}
      </span>
    );
  };

  return (
    <div className="sql-validator-component">
      {/* Validation Summary Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex items-center gap-2">
            {isValidating ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : validationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}

            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isValidating
                ? '验证中...'
                : validationResult.isValid
                ? 'SQL语法正确'
                : `发现 ${getIssueCount()} 个问题`}
            </span>
          </div>

          {/* SQL Type Badge */}
          {getSQLTypeBadge()}
        </div>

        {/* Manual Validate Button */}
        {!realTime && (
          <button
            onClick={handleManualValidate}
            disabled={isValidating || !sql.trim()}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
          >
            验证
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {validationResult.errors.length > 0 && (
        <div className="mt-2 space-y-2">
          <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            错误 ({validationResult.errors.length})
          </h4>
          {validationResult.errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900"
            >
              {getSeverityIcon(error.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error.message}
                </p>
                {error.position && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    第 {error.position.line} 行, 第 {error.position.column} 列
                  </p>
                )}
                {error.code && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-mono rounded">
                    {error.code}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Warnings */}
      {validationResult.warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            警告 ({validationResult.warnings.length})
          </h4>
          {validationResult.warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-900"
            >
              {getSeverityIcon(warning.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {warning.message}
                </p>
                {warning.type && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">
                    {warning.type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success State */}
      {validationResult.isValid && !isValidating && sql.trim() && (
        <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            SQL语句语法正确，可以执行
          </p>
        </div>
      )}
    </div>
  );
};

export default SQLValidator;
