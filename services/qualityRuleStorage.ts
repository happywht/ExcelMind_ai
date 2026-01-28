/**
 * 质量规则存储服务
 * 使用 LocalStorage 管理规则元数据
 */

import { QualityRule, RuleFilter, RuleStatistics, RuleTemplate } from '../types/qualityRule';

const STORAGE_KEY = 'excelmind_quality_rules';
const USAGE_STATS_KEY = 'excelmind_rule_usage_stats';

/**
 * 官方规则模板库
 */
export const OFFICIAL_RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'official-email-format',
    name: '邮箱格式检查',
    description: '检查所有包含"邮箱"或"email"的列，确保邮箱格式正确',
    category: '格式检查',
    checkContent: '检查所有包含"邮箱"、"email"、"邮件"的列',
    criteria: '必须包含@符号，且@后必须有域名（如qq.com、163.com、gmail.com）',
    severity: 'P1',
    executionType: 'local',
    localRule: {
      type: 'format',
      params: { pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }
    },
    exampleColumns: ['邮箱', 'email', 'Email', '电子邮件', '联系邮箱']
  },
  {
    id: 'official-phone-format',
    name: '手机号格式检查',
    description: '检查手机号列，确保格式为中国大陆手机号',
    category: '格式检查',
    checkContent: '检查所有包含"电话"、"手机"、"phone"、"tel"的列',
    criteria: '必须为11位数字，且以1开头，第二位为3-9',
    severity: 'P1',
    executionType: 'local',
    localRule: {
      type: 'format',
      params: { pattern: '^1[3-9]\\d{9}$' }
    },
    exampleColumns: ['手机号', '电话', 'phone', 'Phone', '联系电话', '手机']
  },
  {
    id: 'official-required-fields',
    name: '必填字段检查',
    description: '检查关键业务字段，确保不能为空',
    category: '完整性检查',
    checkContent: '检查关键业务字段（如姓名、身份证、订单号、金额等）',
    criteria: '字段值不能为空、null、空字符串或仅包含空白字符',
    severity: 'P0',
    executionType: 'local',
    localRule: {
      type: 'not_null',
      params: {}
    },
    exampleColumns: ['姓名', '身份证号', '订单号', '金额', '产品名称']
  },
  {
    id: 'official-age-range',
    name: '年龄范围检查',
    description: '检查年龄字段是否在合理范围内',
    category: '合理性检查',
    checkContent: '检查包含"年龄"的列',
    criteria: '年龄必须在18-65岁之间（适用于职场数据）',
    severity: 'P1',
    executionType: 'local',
    localRule: {
      type: 'range',
      params: { min: 18, max: 65 }
    },
    exampleColumns: ['年龄', 'Age', '员工年龄']
  },
  {
    id: 'official-id-card-format',
    name: '身份证号格式检查',
    description: '检查中国大陆身份证号格式是否正确',
    category: '格式检查',
    checkContent: '检查包含"身份证"、"id"的列',
    criteria: '必须为18位数字，或17位数字+X/x（最后一位为校验位）',
    severity: 'P0',
    executionType: 'local',
    localRule: {
      type: 'format',
      params: { pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$' }
    },
    exampleColumns: ['身份证号', '身份证', 'id_card', 'IdCard']
  },
  {
    id: 'official-amount-non-negative',
    name: '金额非负检查',
    description: '检查金额字段，确保金额不为负数',
    category: '合理性检查',
    checkContent: '检查所有包含"金额"、"价格"、"price"、"amount"的列',
    criteria: '金额必须大于或等于0',
    severity: 'P0',
    executionType: 'local',
    localRule: {
      type: 'range',
      params: { min: 0 }
    },
    exampleColumns: ['金额', '价格', 'Price', 'Amount', '单价', '总价', '销售额']
  },
  {
    id: 'official-unique-check',
    name: '重复值检查',
    description: '检查唯一性字段，确保没有重复值',
    category: '唯一性检查',
    checkContent: '检查唯一性字段（如订单号、ID、工号等）',
    criteria: '字段值不能有重复，每个值只能出现一次',
    severity: 'P0',
    executionType: 'local',
    localRule: {
      type: 'unique',
      params: {}
    },
    exampleColumns: ['订单号', 'ID', '工号', '学号', '产品编号']
  },
  {
    id: 'official-date-range',
    name: '日期合理性检查',
    description: '检查日期字段是否在合理范围内',
    category: '合理性检查',
    checkContent: '检查所有日期类型的列',
    criteria: '日期必须在1900-01-01到当前年份+1之间',
    severity: 'P2',
    executionType: 'local',
    localRule: {
      type: 'range',
      params: {
        min: new Date('1900-01-01').getTime(),
        max: new Date().setFullYear(new Date().getFullYear() + 1)
      }
    },
    exampleColumns: ['日期', 'Date', '出生日期', '入职日期', '订单日期']
  },
  {
    id: 'official-text-length',
    name: '数据长度检查',
    description: '检查文本字段长度，防止超长数据',
    category: '格式检查',
    checkContent: '检查文本字段的长度',
    criteria: '文本长度不能超过字段限制（默认50字符）',
    severity: 'P2',
    executionType: 'local',
    localRule: {
      type: 'custom',
      params: { maxLength: 50 }
    },
    exampleColumns: ['姓名', '产品名称', '备注', '描述']
  },
  {
    id: 'official-custom-business-rule',
    name: '业务规则自定义检查',
    description: '使用AI进行自定义业务逻辑检查',
    category: '业务规则',
    checkContent: '用户自定义的业务逻辑描述',
    criteria: '用户自定义的评判标准',
    severity: 'P1',
    executionType: 'ai',
    localRule: undefined,
    exampleColumns: []  // 用户自定义
  }
];

/**
 * 质量规则存储服务类
 */
export class QualityRuleStorage {
  private rules: Map<string, QualityRule> = new Map();
  private usageStats: Map<string, number> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 从 LocalStorage 加载数据
   */
  private loadFromStorage(): void {
    try {
      const storedRules = localStorage.getItem(STORAGE_KEY);
      if (storedRules) {
        const rulesArray: QualityRule[] = JSON.parse(storedRules);
        rulesArray.forEach(rule => {
          this.rules.set(rule.id, rule);
        });
      }

      const storedStats = localStorage.getItem(USAGE_STATS_KEY);
      if (storedStats) {
        const statsObj = JSON.parse(storedStats) as Record<string, number>;
        this.usageStats = new Map(Object.entries(statsObj));
      }

      // 如果存储为空，初始化官方规则
      if (this.rules.size === 0) {
        this.initializeOfficialRules();
      }
    } catch (error) {
      console.error('加载规则数据失败:', error);
      this.initializeOfficialRules();
    }
  }

  /**
   * 保存到 LocalStorage
   */
  private saveToStorage(): void {
    try {
      const rulesArray = Array.from(this.rules.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rulesArray));

      const statsObj = Object.fromEntries(this.usageStats);
      localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(statsObj));
    } catch (error) {
      console.error('保存规则数据失败:', error);
    }
  }

  /**
   * 初始化官方规则
   */
  private initializeOfficialRules(): void {
    OFFICIAL_RULE_TEMPLATES.forEach(template => {
      const rule: QualityRule = {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        checkContent: template.checkContent,
        criteria: template.criteria,
        severity: template.severity,
        executionType: template.executionType,
        localRule: template.localRule,
        targetColumns: template.exampleColumns,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        isOfficial: true,
        isEnabled: true
      };
      this.rules.set(rule.id, rule);
    });
    this.saveToStorage();
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存规则（创建或更新）
   */
  async saveRule(rule: Partial<QualityRule> & Pick<QualityRule, 'name' | 'description' | 'category' | 'checkContent' | 'criteria' | 'severity' | 'executionType' | 'isEnabled' | 'isOfficial'>): Promise<QualityRule> {
    const now = new Date().toISOString();
    const newRule: QualityRule = {
      ...rule,
      id: rule.id || this.generateId(),
      createdAt: rule.id ? this.rules.get(rule.id)?.createdAt || now : now,
      updatedAt: now,
      usageCount: rule.id ? this.rules.get(rule.id)?.usageCount || 0 : 0
    } as QualityRule;

    this.rules.set(newRule.id, newRule);
    this.saveToStorage();

    return newRule;
  }

  /**
   * 获取单个规则
   */
  async getRule(id: string): Promise<QualityRule | null> {
    return this.rules.get(id) || null;
  }

  /**
   * 列出所有规则
   */
  async listRules(filter?: RuleFilter): Promise<QualityRule[]> {
    let rules = Array.from(this.rules.values());

    // 应用筛选条件
    if (filter) {
      if (filter.category) {
        rules = rules.filter(r => r.category === filter.category);
      }
      if (filter.severity) {
        rules = rules.filter(r => r.severity === filter.severity);
      }
      if (filter.executionType) {
        rules = rules.filter(r => r.executionType === filter.executionType);
      }
      if (filter.isOfficial !== undefined) {
        rules = rules.filter(r => r.isOfficial === filter.isOfficial);
      }
      if (filter.isEnabled !== undefined) {
        rules = rules.filter(r => r.isEnabled === filter.isEnabled);
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        rules = rules.filter(r =>
          r.name.toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term) ||
          r.category.toLowerCase().includes(term)
        );
      }
    }

    // 按使用次数和更新时间排序
    return rules.sort((a, b) => {
      if (a.isOfficial !== b.isOfficial) {
        return a.isOfficial ? -1 : 1;
      }
      return b.usageCount - a.usageCount;
    });
  }

  /**
   * 删除规则
   */
  async deleteRule(id: string): Promise<void> {
    if (!this.rules.has(id)) {
      throw new Error(`规则不存在: ${id}`);
    }

    const rule = this.rules.get(id)!;
    if (rule.isOfficial) {
      throw new Error('不能删除官方规则，可以禁用');
    }

    this.rules.delete(id);
    this.usageStats.delete(id);
    this.saveToStorage();
  }

  /**
   * 切换规则启用状态
   */
  async toggleRule(id: string): Promise<QualityRule> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`规则不存在: ${id}`);
    }

    rule.isEnabled = !rule.isEnabled;
    rule.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return rule;
  }

  /**
   * 增加规则使用次数
   */
  async incrementUsage(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (rule) {
      rule.usageCount++;
      this.saveToStorage();
    }
  }

  /**
   * 获取官方规则
   */
  async getOfficialRules(): Promise<QualityRule[]> {
    return Array.from(this.rules.values()).filter(r => r.isOfficial);
  }

  /**
   * 获取自定义规则
   */
  async getCustomRules(): Promise<QualityRule[]> {
    return Array.from(this.rules.values()).filter(r => !r.isOfficial);
  }

  /**
   * 获取规则统计信息
   */
  async getStatistics(): Promise<RuleStatistics> {
    const allRules = Array.from(this.rules.values());

    const rulesByCategory: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0
    };

    allRules.forEach(rule => {
      rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1;
      rulesBySeverity[rule.severity]++;
    });

    const mostUsedRules = allRules
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(r => ({
        ruleId: r.id,
        name: r.name,
        usageCount: r.usageCount
      }));

    return {
      totalRules: allRules.length,
      officialRules: allRules.filter(r => r.isOfficial).length,
      customRules: allRules.filter(r => !r.isOfficial).length,
      enabledRules: allRules.filter(r => r.isEnabled).length,
      rulesByCategory,
      rulesBySeverity: rulesBySeverity as any,
      mostUsedRules
    };
  }

  /**
   * 获取规则模板
   */
  async getTemplates(): Promise<RuleTemplate[]> {
    return OFFICIAL_RULE_TEMPLATES;
  }

  /**
   * 从模板创建规则
   */
  async createFromTemplate(templateId: string, customizations: Partial<QualityRule>): Promise<QualityRule> {
    const template = OFFICIAL_RULE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`模板不存在: ${templateId}`);
    }

    const rule: Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      category: customizations.category || template.category,
      checkContent: customizations.checkContent || template.checkContent,
      criteria: customizations.criteria || template.criteria,
      severity: customizations.severity || template.severity,
      executionType: customizations.executionType || template.executionType,
      localRule: customizations.localRule || template.localRule,
      targetColumns: customizations.targetColumns || template.exampleColumns,
      isOfficial: false,
      isEnabled: true
    };

    return this.saveRule(rule);
  }

  /**
   * 导出规则
   */
  async exportRules(ruleIds?: string[]): Promise<string> {
    const rulesToExport = ruleIds
      ? ruleIds.map(id => this.rules.get(id)).filter(Boolean) as QualityRule[]
      : Array.from(this.rules.values());

    return JSON.stringify(rulesToExport, null, 2);
  }

  /**
   * 导入规则
   */
  async importRules(jsonData: string, overwrite: boolean = false): Promise<number> {
    const importedRules: QualityRule[] = JSON.parse(jsonData);
    let importCount = 0;

    for (const rule of importedRules) {
      const existingRule = this.rules.get(rule.id);

      if (existingRule) {
        if (overwrite) {
          // 保留使用次数
          rule.usageCount = existingRule.usageCount;
          this.rules.set(rule.id, rule);
          importCount++;
        }
      } else {
        // 重新生成ID避免冲突
        rule.id = this.generateId();
        rule.usageCount = 0;
        this.rules.set(rule.id, rule);
        importCount++;
      }
    }

    this.saveToStorage();
    return importCount;
  }

  /**
   * 重置为默认状态
   */
  async resetToDefault(): Promise<void> {
    this.rules.clear();
    this.usageStats.clear();
    this.initializeOfficialRules();
  }

  /**
   * 清空所有自定义规则
   */
  async clearCustomRules(): Promise<void> {
    const customRuleIds = Array.from(this.rules.values())
      .filter(r => !r.isOfficial)
      .map(r => r.id);

    customRuleIds.forEach(id => {
      this.rules.delete(id);
      this.usageStats.delete(id);
    });

    this.saveToStorage();
  }
}

// 导出单例
export const qualityRuleStorage = new QualityRuleStorage();
