/**
 * OutputParser.js - 输出解析器
 *
 * 负责解析 CLI 的 stdout 输出，提取任务进度、交互请求和完成状态
 */

class OutputParser {
  constructor() {
    // 进度匹配模式
    this.progressPatterns = [
      // [2/5] 格式
      /\[(\d+)\/(\d+)\]\s*(.+)/,
      // 2/5 格式
      /(\d+)\s*\/\s*(\d+)\s*(.+)/,
      // 百分比格式
      /(\d+)%\s*(complete|completed|done|完成)/i,
      // 进度条格式
      /█+\s*░*\s*(\d+)%/i
    ];

    // 交互请求匹配模式
    this.interactionPatterns = [
      // 中英文确认提示
      /(是否|确认|继续|覆盖|是否继续|请确认)/i,
      /(continue\?|yes\/no|y\/n|proceed|confirm|overwrite)/i,
      // 询问输入
      /(please enter|input required|please provide|请输入|请提供)/i,
      // 选择提示
      /(choose|select|option|选择)/i
    ];

    // 完成状态匹配模式
    this.completionPatterns = [
      // 成功完成
      /(done|completed|finished|success|successful|完成|成功)/i,
      // 失败
      /(error|failed|failure|failed to|错误|失败)/i,
      // 任务结束标记
      /(task complete|process finished|finished|ended|任务完成|进程结束)/i
    ];

    // 错误模式
    this.errorPatterns = [
      /error:/i,
      /exception:/i,
      /failed/i,
      /cannot/i,
      /unable to/i,
      /错误/i,
      /失败/i
    ];

    // 警告模式
    this.warningPatterns = [
      /warning:/i,
      /warn:/i,
      /注意/i,
      /警告/i
    ];
  }

  /**
   * 解析单行输出
   * @param {string} line - 输出的一行
   * @returns {Object} 解析结果对象
   */
  parseLine(line) {
    const result = {
      type: 'output', // output, progress, interaction, completion, error, warning
      content: line,
      data: null
    };

    // 检查进度
    const progressData = this._parseProgress(line);
    if (progressData) {
      result.type = 'progress';
      result.data = progressData;
      return result;
    }

    // 检查交互请求
    if (this._isInteractionRequest(line)) {
      result.type = 'interaction';
      result.data = {
        prompt: line,
        requiresInput: this._requiresTextInput(line)
      };
      return result;
    }

    // 检查完成状态
    const completionData = this._parseCompletion(line);
    if (completionData) {
      result.type = 'completion';
      result.data = completionData;
      return result;
    }

    // 检查错误
    if (this._isError(line)) {
      result.type = 'error';
      result.data = {
        message: line,
        isFatal: this._isFatalError(line)
      };
      return result;
    }

    // 检查警告
    if (this._isWarning(line)) {
      result.type = 'warning';
      result.data = {
        message: line
      };
      return result;
    }

    return result;
  }

  /**
   * 解析进度信息
   * @private
   */
  _parseProgress(line) {
    for (const pattern of this.progressPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (line.includes('%')) {
          // 百分比格式
          return {
            percentage: parseInt(match[1]),
            message: match[0]
          };
        } else if (match.length >= 3) {
          // [2/5] 或 2/5 格式
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);
          const message = match[3] || '';

          return {
            current,
            total,
            percentage: Math.round((current / total) * 100),
            message: message.trim()
          };
        }
      }
    }
    return null;
  }

  /**
   * 检查是否是交互请求
   * @private
   */
  _isInteractionRequest(line) {
    return this.interactionPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检查是否需要文本输入
   * @private
   */
  _requiresTextInput(line) {
    const inputPatterns = [
      /please enter/i,
      /input required/i,
      /value:/i,
      /请输入/i,
      /请提供/i
    ];
    return inputPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 解析完成状态
   * @private
   */
  _parseCompletion(line) {
    for (const pattern of this.completionPatterns) {
      if (pattern.test(line)) {
        const isFailure = this.errorPatterns.some(p => p.test(line));
        return {
          status: isFailure ? 'failed' : 'success',
          message: line
        };
      }
    }
    return null;
  }

  /**
   * 检查是否是错误
   * @private
   */
  _isError(line) {
    return this.errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检查是否是致命错误
   * @private
   */
  _isFatalError(line) {
    const fatalPatterns = [
      /fatal error/i,
      /critical error/i,
      /unhandled exception/i,
      /cannot continue/i,
      /致命错误/i,
      /无法继续/i
    ];
    return fatalPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 检查是否是警告
   * @private
   */
  _isWarning(line) {
    return this.warningPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 解析多行输出
   * @param {string} output - 完整的输出文本
   * @returns {Array} 解析结果数组
   */
  parseOutput(output) {
    const lines = output.split('\n');
    return lines.map(line => this.parseLine(line)).filter(result => result.content.trim());
  }

  /**
   * 从输出中提取最终的完成状态
   * @param {Array} parsedResults - parseOutput 的结果数组
   * @returns {Object|null} 最终完成状态
   */
  extractFinalStatus(parsedResults) {
    // 从后往前查找完成状态
    for (let i = parsedResults.length - 1; i >= 0; i--) {
      const result = parsedResults[i];
      if (result.type === 'completion') {
        return result.data;
      }
      if (result.type === 'error' && result.data.isFatal) {
        return {
          status: 'failed',
          message: result.data.message
        };
      }
    }
    return null;
  }
}

module.exports = OutputParser;
