/**
 * 模板上传组件
 *
 * 支持拖拽和点击上传 .docx 模板文件
 *
 * @version 2.0.0
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TemplateUploadProgress } from './types';

interface TemplateUploadProps {
  onUpload: (file: File) => Promise<void>;
  onExtractVariables?: (file: File) => Promise<void>;
  className?: string;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

const TemplateUpload: React.FC<TemplateUploadProps> = ({
  onUpload,
  onExtractVariables,
  className,
  accept = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const [uploadProgress, setUploadProgress] = useState<TemplateUploadProgress | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const error = rejection.errors[0];

        if (error.code === 'file-too-large') {
          setUploadProgress({
            stage: 'error',
            progress: 0,
            message: `文件过大，最大支持 ${Math.round(maxSize / 1024 / 1024)}MB`,
          });
        } else if (error.code === 'file-invalid-type') {
          setUploadProgress({
            stage: 'error',
            progress: 0,
            message: '不支持的文件格式，请上传 .docx 文件',
          });
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFile(file);
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: '准备上传...',
      });

      try {
        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (!prev || prev.progress >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return {
              ...prev,
              progress: prev.progress + 10,
              message: `上传中... ${prev.progress + 10}%`,
            };
          });
        }, 200);

        await onUpload(file);

        clearInterval(progressInterval);

        setUploadProgress({
          stage: 'processing',
          progress: 95,
          message: '处理模板中...',
        });

        // 提取变量
        if (onExtractVariables) {
          await onExtractVariables(file);
        }

        setUploadProgress({
          stage: 'completed',
          progress: 100,
          message: '上传成功！',
        });
      } catch (error) {
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '上传失败，请重试',
        });
      }
    },
    [onUpload, onExtractVariables, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadProgress(null);
  };

  const getStatusIcon = () => {
    if (!uploadProgress) return null;

    switch (uploadProgress.stage) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 上传区域 */}
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer',
            'flex flex-col items-center justify-center gap-3 min-h-[200px]',
            isDragActive && !isDragReject && 'border-emerald-500 bg-emerald-50',
            isDragReject && 'border-red-500 bg-red-50',
            !isDragActive && 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
          )}
          role="button"
          tabIndex={0}
          aria-label="上传模板文件"
        >
          <input {...getInputProps()} aria-label="文件输入" />

          <div
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-full transition-colors',
              isDragActive && !isDragReject && 'bg-emerald-100',
              isDragReject && 'bg-red-100',
              !isDragActive && 'bg-slate-100'
            )}
          >
            <Upload
              className={cn(
                'w-8 h-8 transition-colors',
                isDragActive && !isDragReject && 'text-emerald-600',
                isDragReject && 'text-red-600',
                !isDragActive && 'text-slate-500'
              )}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-slate-700 mb-1">
              {isDragActive
                ? isDragReject
                  ? '不支持的文件格式'
                  : '释放以上传模板'
                : '拖拽模板文件到这里'}
            </p>
            <p className="text-xs text-slate-500">
              或点击选择文件 · 支持 .docx 格式 · 最大 {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      ) : (
        /* 已上传文件显示 */
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {uploadedFile.name}
                  </p>
                  {getStatusIcon()}
                </div>
                <p className="text-xs text-slate-500">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>

                {/* 进度条 */}
                {uploadProgress && uploadProgress.stage !== 'completed' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className={cn(
                          uploadProgress.stage === 'error'
                            ? 'text-red-600'
                            : 'text-slate-600'
                        )}
                      >
                        {uploadProgress.message}
                      </span>
                      <span className="text-slate-500">{uploadProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          uploadProgress.stage === 'error'
                            ? 'bg-red-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {uploadProgress?.stage === 'error' && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">{uploadProgress.message}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleRemoveFile}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="移除文件"
              type="button"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* 帮助信息 */}
      <div className="text-xs text-slate-500 space-y-1">
        <p className="font-medium">模板文件要求：</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>使用 {`{变量名}`} 格式定义占位符</li>
          <li>支持表格和条件块</li>
          <li>文件大小不超过 {Math.round(maxSize / 1024 / 1024)}MB</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateUpload;
