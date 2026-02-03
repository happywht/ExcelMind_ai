
import { MappingScheme, FieldMapping } from '../types/documentTypes';
import { aiProcessingService } from './aiProcessingService';

interface BatchProcessResult {
    enrichedData: any[]; // 包含 AI 计算结果的新数据
    runtimeMapping: MappingScheme; // 修改后的映射方案（指向计算结果）
}

type ProgressCallback = (current: number, total: number) => void;

/**
 * AI 批量处理服务
 * 负责在文档生成前，预先计算所有 AI 规则字段
 */
export const aiBatchService = {
    /**
     * 执行批量处理
     * @param excelData 原始 Excel 数据 (数组)
     * @param mappingScheme 原始映射方案
     * @param onProgress 进度回调
     */
    async processBatch(
        excelData: any[],
        mappingScheme: MappingScheme,
        onProgress?: ProgressCallback
    ): Promise<BatchProcessResult> {
        // 1. 识别 AI 映射规则
        const aiMappings = mappingScheme.mappings.filter(m =>
            m.ruleType === 'ai' || (m.transform && m.transform.trim().startsWith('// AI'))
        );

        // 如果没有 AI 规则，直接返回原数据
        if (aiMappings.length === 0) {
            return {
                enrichedData: excelData,
                runtimeMapping: mappingScheme
            };
        }

        console.log(`[AI Batch] Found ${aiMappings.length} AI rules. Processing ${excelData.length} rows.`);

        // 2. 准备运行时映射方案
        // AI 规则将被转换为指向临时字段的直接映射
        const runtimeMappings = mappingScheme.mappings.map(m => {
            if (aiMappings.includes(m)) {
                return {
                    ...m,
                    // 将来源列指向预计算的临时字段
                    excelColumn: `__AI_${m.placeholder}`,
                    // 移除 transform，因为值已经计算好了
                    transform: undefined,
                    ruleType: 'direct' as const
                };
            }
            return m;
        });

        const runtimeMappingScheme = {
            ...mappingScheme,
            mappings: runtimeMappings
        };

        // 3. 批量处理数据
        // 为了防止大量并发请求导致后端或 API 崩溃，我们需要分批处理
        const BATCH_SIZE = 5; // 并发数
        const enrichedData = [...excelData]; // 浅拷贝数组
        const total = excelData.length;
        let completed = 0;

        // 按块处理
        for (let i = 0; i < total; i += BATCH_SIZE) {
            const chunk = enrichedData.slice(i, i + BATCH_SIZE);

            // 并行处理当前块中的每一行
            const chunkPromises = chunk.map(async (row, chunkIndex) => {
                const rowIndex = i + chunkIndex;
                // 这一行数据的副本，避免直接修改原对象（虽然上面是浅拷贝数组，但行对象还是引用）
                // 不过为了性能，直接修改引用对象在此时是可接受的，只要我们明确 enrichedData 是给生成器用的
                const enrichedRow = { ...row };

                // 对这一行应用所有 AI 规则
                for (const mapping of aiMappings) {
                    const rule = mapping.transform || '';
                    // 调用 AI 服务
                    // 注意：这里 context 可以是整行数据，也可以是特定列（如果需要优化 token）
                    // 目前 aiProcessingService.processRule 支持传入整行 contextValue
                    const result = await aiProcessingService.processRule(rule, row);

                    // 将结果存入临时字段
                    enrichedRow[`__AI_${mapping.placeholder}`] = result.result || '';
                }

                // 更新回数据数组
                enrichedData[rowIndex] = enrichedRow;
            });

            // 等待当前块完成
            await Promise.all(chunkPromises);

            // 更新进度
            completed += chunk.length;
            if (completed > total) completed = total;

            if (onProgress) {
                onProgress(completed, total);
            }
        }

        return {
            enrichedData,
            runtimeMapping: runtimeMappingScheme
        };
    }
};
