# Phase 2 API 快速参考指南

> **版本**: v2.0.0
> **更新日期**: 2026-01-25

本文档提供 Phase 2 API 端点的快速参考，方便开发者快速查找。

## 基础信息

- **基础 URL**: `https://api.excelmind.ai/v2`
- **认证方式**: `Bearer Token`
- **响应格式**: `JSON`

---

## API 端点速查表

### 1. 智能数据处理模块

| 端点 | 方法 | 描述 |
|------|------|------|
| `/data-quality/analyze` | POST | 分析数据质量 |
| `/data-quality/suggestions` | POST | 获取清洗建议 |
| `/data-quality/clean` | POST | 执行数据清洗 |
| `/data-quality/transform-rules` | POST | 创建转换规则 |
| `/data-quality/transform-rules` | GET | 列出转换规则 |
| `/data-quality/apply-rules` | POST | 应用转换规则 |

### 2. 多模板文档生成模块

| 端点 | 方法 | 描述 |
|------|------|------|
| `/templates` | POST | 上传模板 |
| `/templates` | GET | 列出模板 |
| `/templates/{templateId}` | GET | 获取模板详情 |
| `/templates/{templateId}` | PUT | 更新模板 |
| `/templates/{templateId}` | DELETE | 删除模板 |
| `/generation/batch` | POST | 创建批量生成任务 |
| `/generation/status/{taskId}` | GET | 查询生成进度 |
| `/generation/download/{taskId}/{templateId}/{documentId}` | GET | 下载单个文档 |
| `/generation/download/{taskId}/zip` | GET | 下载 ZIP 压缩包 |
| `/generation/cancel/{taskId}` | POST | 取消生成任务 |

### 3. 审计规则引擎模块

| 端点 | 方法 | 描述 |
|------|------|------|
| `/audit/rules` | POST | 创建审计规则 |
| `/audit/rules` | GET | 列出审计规则 |
| `/audit/rules/{ruleId}` | GET | 获取规则详情 |
| `/audit/rules/{ruleId}` | PUT | 更新审计规则 |
| `/audit/rules/{ruleId}` | DELETE | 删除审计规则 |
| `/audit/execute` | POST | 执行审计 |
| `/audit/reports/{auditId}` | GET | 获取审计报告 |

### 4. 性能监控模块

| 端点 | 方法 | 描述 |
|------|------|------|
| `/monitoring/metrics` | GET | 获取性能指标 |
| `/monitoring/reports` | GET | 获取性能报告 |
| `/monitoring/alerts` | POST | 创建性能告警 |
| `/monitoring/alerts` | GET | 列出告警规则 |
| `/monitoring/alerts/{alertId}` | GET | 获取告警详情 |
| `/monitoring/alerts/{alertId}` | PUT | 更新告警规则 |
| `/monitoring/alerts/{alertId}` | DELETE | 删除告警规则 |

### 5. 质量控制模块

| 端点 | 方法 | 描述 |
|------|------|------|
| `/quality/validate/sql` | POST | 验证 SQL |
| `/quality/detect-hallucination` | POST | 检测 AI 幻觉 |
| `/quality/fix-suggestions` | POST | 生成修复建议 |
| `/quality/gates` | POST | 创建质量门禁 |
| `/quality/gates` | GET | 列出质量门禁 |
| `/quality/gates/{gateId}/check` | POST | 执行质量门禁检查 |

---

## HTTP 状态码速查

| 状态码 | 名称 | 描述 |
|--------|------|------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权 |
| 403 | Forbidden | 禁止访问 |
| 404 | Not Found | 资源不存在 |
| 408 | Request Timeout | 请求超时 |
| 409 | Conflict | 资源冲突 |
| 413 | Payload Too Large | 请求体过大 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务不可用 |

---

## 错误代码速查

### 通用错误 (1xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 1000 | 未知错误 | 是 |
| 1001 | 请求参数验证失败 | 否 |
| 1002 | 未授权 | 否 |
| 1003 | 禁止访问 | 否 |
| 1004 | 资源不存在 | 否 |
| 1005 | 资源冲突 | 否 |
| 1006 | 超出速率限制 | 是 |
| 1007 | 服务器内部错误 | 是 |
| 1008 | 服务不可用 | 是 |
| 1009 | 请求超时 | 是 |
| 1010 | 不支持的操作 | 否 |

### 文件处理错误 (2xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 2000 | 文件不存在 | 否 |
| 2001 | 文件过大 | 否 |
| 2002 | 无效的文件格式 | 否 |
| 2003 | 文件上传失败 | 是 |
| 2004 | 文件下载失败 | 是 |
| 2005 | 文件解析失败 | 否 |
| 2006 | 文件已损坏 | 否 |
| 2007 | 不支持的文件类型 | 否 |

### 数据处理错误 (3xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 3000 | 数据质量分析失败 | 是 |
| 3001 | 数据清洗失败 | 是 |
| 3002 | 转换规则不存在 | 否 |
| 3003 | 转换执行失败 | 是 |
| 3004 | Sheet 不存在 | 否 |
| 3005 | 列不存在 | 否 |
| 3006 | 数据类型不匹配 | 否 |
| 3007 | 数据格式错误 | 否 |
| 3008 | 数据转换失败 | 是 |
| 3009 | 数据源不存在 | 否 |

### 模板和文档生成错误 (4xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 4000 | 模板不存在 | 否 |
| 4001 | 模板格式无效 | 否 |
| 4002 | 模板上传失败 | 是 |
| 4003 | 文档生成失败 | 是 |
| 4004 | 下载失败 | 是 |
| 4005 | 占位符未映射 | 否 |
| 4006 | 模板解析失败 | 否 |
| 4007 | 批量生成失败 | 是 |
| 4008 | 文档格式不支持 | 否 |
| 4009 | 任务不存在 | 否 |
| 4010 | 任务已取消 | 否 |
| 4011 | 任务已失败 | 是 |

### 审计规则错误 (5xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 5000 | 审计规则不存在 | 否 |
| 5001 | 审计执行失败 | 是 |
| 5002 | 审计报告生成失败 | 是 |
| 5003 | 审计规则表达式错误 | 否 |
| 5004 | 审计条件无效 | 否 |

### SQL 相关错误 (6xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 6000 | SQL 语法错误 | 否 |
| 6001 | SQL 标识符不存在 | 否 |
| 6002 | SQL 验证失败 | 否 |
| 6003 | SQL 执行失败 | 是 |
| 6004 | SQL 查询超时 | 是 |
| 6005 | SQL 查询过于复杂 | 否 |

### 质量控制错误 (7xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 7000 | 检测到 AI 幻觉 | 否 |
| 7001 | 质量门禁检查失败 | 否 |
| 7002 | 验证失败 | 否 |
| 7003 | AI 输出验证失败 | 是 |
| 7004 | 结果验证失败 | 否 |
| 7005 | 质量分数低于阈值 | 否 |

### 性能监控错误 (8xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 8000 | 性能指标获取失败 | 是 |
| 8001 | 性能报告生成失败 | 是 |
| 8002 | 性能告警规则不存在 | 否 |
| 8003 | 性能告警创建失败 | 是 |

### WebSocket 错误 (9xxx)

| 代码 | 描述 | 可重试 |
|------|------|--------|
| 9000 | WebSocket 连接失败 | 是 |
| 9001 | WebSocket 认证失败 | 否 |
| 9002 | WebSocket 订阅失败 | 否 |
| 9003 | WebSocket 消息格式错误 | 否 |

---

## 速率限制

| 用户级别 | 请求限制 | 时间窗口 |
|---------|----------|----------|
| 免费用户 | 60 requests | 1 minute |
| 基础用户 | 300 requests | 1 minute |
| 专业用户 | 1000 requests | 1 minute |
| 企业用户 | 5000 requests | 1 minute |

### 特殊端点限制

| 端点类型 | 限制 | 时间窗口 |
|---------|------|----------|
| AI 调用 | 30 requests | 1 minute |
| 批量生成 | 5 tasks | 1 hour |
| 文档下载 | 100 requests | 1 minute |

---

## 请求头

```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
X-Request-ID: {unique_request_id}
X-Client-Version: {client_version}
Accept-Language: zh-CN
```

---

## 响应头

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1737820860
X-RateLimit-Reset-After: 45
X-Total-Count: 100
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 5
```

---

## WebSocket 频道

| 频道名 | 描述 |
|--------|------|
| `task_progress` | 任务进度更新 |
| `generation_status` | 生成状态更新 |
| `audit_alerts` | 审计告警 |
| `performance_alerts` | 性能告警 |

### WebSocket 消息类型

| 类型 | 描述 |
|------|------|
| `task_progress` | 任务进度消息 |
| `generation_status` | 生成状态消息 |
| `audit_alert` | 审计告警消息 |
| `performance_alert` | 性能告警消息 |

---

## 分页参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `page` | integer | 1 | 页码（从1开始） |
| `pageSize` | integer | 20 | 每页数量（1-100） |
| `sortBy` | string | createdAt | 排序字段 |
| `order` | string | desc | 排序方向：asc/desc |

---

## 时间范围参数

| 值 | 描述 |
|----|------|
| `1h` | 最近1小时 |
| `6h` | 最近6小时 |
| `24h` | 最近24小时 |
| `7d` | 最近7天 |
| `30d` | 最近30天 |

---

## 常用数据类型

### 任务状态

| 状态 | 描述 |
|------|------|
| `pending` | 等待中 |
| `processing` | 处理中 |
| `completed` | 已完成 |
| `failed` | 已失败 |
| `cancelled` | 已取消 |

### 严重程度

| 级别 | 描述 |
|------|------|
| `low` | 低 |
| `medium` | 中 |
| `high` | 高 |
| `critical` | 严重 |

### 数据质量问题类型

| 类型 | 描述 |
|------|------|
| `missing_value` | 缺失值 |
| `duplicate` | 重复值 |
| `inconsistent_format` | 格式不一致 |
| `outlier` | 异常值 |

### 审计规则类别

| 类别 | 描述 |
|------|------|
| `data_quality` | 数据质量 |
| `data_validation` | 数据验证 |
| `business_rule` | 业务规则 |
| `security` | 安全 |
| `compliance` | 合规 |

---

## 快速链接

- **完整 API 规范**: [API_SPECIFICATION_PHASE2.md](./API_SPECIFICATION_PHASE2.md)
- **使用示例**: [API_USAGE_EXAMPLES.md](./API_USAGE_EXAMPLES.md)
- **在线文档**: https://docs.excelmind.ai
- **GitHub**: https://github.com/excelmind/api
- **状态页**: https://status.excelmind.ai

---

## 获取帮助

- **文档**: https://docs.excelmind.ai
- **支持邮箱**: support@excelmind.ai
- **GitHub Issues**: https://github.com/excelmind/api/issues

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-25
**维护者**: ExcelMind AI API Team
