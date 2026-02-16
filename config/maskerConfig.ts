/**
 * Masker Configuration (V7.2)
 * Centralized configuration for the DataMasker service.
 * Allows easy updates to skip keywords and column names without modifying core logic.
 */

export const MASKER_CONFIG = {
    // Common terms to skip masking (Accounting, UI, Logic)
    SKIP_KEYWORDS: [
        // Accounting & Finance
        '张表', '公式', '科目', '金额', '日期', '摘要', '合计', '序号', '名称', '类型', '工作',
        '文件', '利润', '收入', '支出', '核对', '匹配', '查找', '导出', '导入', '点击', '按钮',
        '公司', '工作表', '工作簿', '单元格', '列头', '表头', '样本', '数据',
        '借方', '贷方', '余额', '凭证', '税额', '税率', '单价', '数量', '总价',
        '年', '月', '日', '季度', '本期', '上期', '累计'
    ],

    // Heuristic suffixes that usually indicate non-sensitive descriptions
    DESC_SUFFIXES: [
        '表', '项', '类', '额', '率', '数', '位', '单', '号', '码'
    ],

    // Columns to strictly preserve (case-insensitive partial match)
    PRESERVE_COLUMNS: [
        '摘要', '备注', '说明',
        'abstract', 'summary', 'note', 'comment', 'description', 'remark'
    ]
};
