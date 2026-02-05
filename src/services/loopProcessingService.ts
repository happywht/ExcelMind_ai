/**
 * 循环处理服务 (Loop Processing Service)
 * 
 * 功能：
 * 负责处理 One-to-Many 的数据结构生成，包括：
 * 1. 单表分组 (Group By): 将扁平的Excel行按照特定列分组
 * 2. 跨表关联 (Lookup Join): 将主表数据与从表数据通过外键关联
 * 
 * @version 1.1.0
 */

import { LoopMapping } from '../types/documentTypes';

/**
 * 循环处理结果
 */
export interface LoopResult {
    [loopName: string]: any[]; // e.g. "Orders": [{...}, {...}]
}

/**
 * 执行循环处理
 * 
 * @param row 主表当前行数据
 * @param loopMappings 循环映射配置列表
 * @param allSheetsData 所有Sheet的数据
 * @param rowIndex 主表当前行索引 (用于调试或日志)
 * @param loopIndexes - (Optional) Pre-built indexes for fast lookup: Map<LoopPlaceholder, Map<Key, Rows[]>>
 * @returns 处理后的循环数据对象
 */
export function executeLoopProcessing(
    row: any,
    loopMappings: LoopMapping[],
    allSheetsData: Record<string, any[]>,
    rowIndex: number,
    loopIndexes?: Map<string, Map<string, any[]>>
): LoopResult {
    const result: LoopResult = {};

    loopMappings.forEach(loop => {
        // 1. 获取循环名称 (去除 {#...})
        const loopName = loop.loopPlaceholder.replace(/^\{\#|\}$/g, '').replace(/^#/, '');

        // 2. 根据类型执行不同逻辑
        if (loop.type === 'lookup') {
            result[loopName] = processLookupLoop(row, loop, allSheetsData, rowIndex, loopIndexes);
        } else if (loop.type === 'group_by') {
            result[loopName] = processGroupByLoop(row, loop, allSheetsData, loopIndexes);
        }
    });

    return result;
}

/**
 * 处理跨表关联循环 (Lookup Logic)
 */
function processLookupLoop(
    mainRow: any,
    loop: LoopMapping,
    allSheetsData: Record<string, any[]>,
    mainRowIndex: number,
    loopIndexes?: Map<string, Map<string, any[]>>
): any[] {
    if (!loop.sourceSheet || !loop.foreignKey) {
        console.warn(`Loop ${loop.loopPlaceholder} missing sourceSheet or foreignKey`);
        return [];
    }

    // Get join value from Main Row
    const joinValue = mainRow[loop.foreignKey];
    if (!joinValue) return [];

    let matchedRows: any[] = [];

    // Optimization: Use Index if available
    if (loopIndexes && loopIndexes.has(loop.loopPlaceholder)) {
        const index = loopIndexes.get(loop.loopPlaceholder)!;
        matchedRows = index.get(String(joinValue)) || [];
    } else {
        // Fallback: Scan array
        const sourceData = allSheetsData[loop.sourceSheet] || [];
        matchedRows = sourceData.filter(childRow => {
            // 宽松匹配：字符串比较
            return String(childRow[loop.foreignKey!] || '') === String(joinValue);
        });
    }

    return matchedRows.map(childRow => mapChildRow(childRow, loop));
}

/**
 * 处理单表分组循环 (Group By Logic)
 * 场景：主表就是明细表，当前 row 是其中一行。我们想找出所有同组的行。
 */
function processGroupByLoop(
    currentRow: any,
    loop: LoopMapping,
    allSheetsData: Record<string, any[]>,
    loopIndexes?: Map<string, Map<string, any[]>>
): any[] {
    const groupCol = loop.groupByColumn;
    if (!groupCol) return [];

    const groupVal = currentRow[groupCol];
    if (!groupVal) return [];

    let matchedRows: any[] = [];

    // Optimization: Use Index if available
    if (loopIndexes && loopIndexes.has(loop.loopPlaceholder)) {
        const index = loopIndexes.get(loop.loopPlaceholder)!;
        matchedRows = index.get(String(groupVal)) || [];
    } else {
        // Fallback
        const targetSheetName = loop.sourceSheet || 'Sheet1'; // Default to "Sheet1" if not specified, implies current sheet.
        // Ideally caller ensures 'sourceSheet' points to the same sheet for GroupBy.

        const targetData = allSheetsData[targetSheetName] || [];
        matchedRows = targetData.filter(r => String(r[groupCol]) === String(groupVal));
    }

    return matchedRows.map(childRow => mapChildRow(childRow, loop));
}

/**
 * 映射子行数据 (Apply Sub-Mappings)
 */
function mapChildRow(childRow: any, loop: LoopMapping): any {
    const mappedChild: any = {};

    loop.mappings.forEach(m => {
        // 去除占位符的花括号 {{Name}} -> Name
        const key = m.placeholder.replace(/^\{\{|\}\}$/g, '').trim();

        // 获取Excel值
        let val = childRow[m.excelColumn];

        // 简单的转换逻辑 (后续可复用 FormatService)
        if (val === undefined || val === null) val = '';

        mappedChild[key] = val;
    });

    return mappedChild;
}
