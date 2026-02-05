/**
 * 模板存储服务
 * 用于管理本地模板库
 */

import { LocalTemplateMetadata } from '../types/templateStorage';

class TemplateStorage {
    private storageKey = 'excelmind_template_library';
    private fileStorageKey = 'excelmind_template_files';

    /**
     * 获取所有模板元数据
     */
    async getAllTemplates(): Promise<LocalTemplateMetadata[]> {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[TemplateStorage] Failed to get templates:', error);
            return [];
        }
    }

    /**
     * 保存模板
     */
    async saveTemplate(
        file: File,
        metadata: Omit<LocalTemplateMetadata, 'id' | 'createdAt' | 'updatedAt' | 'fileSize'>
    ): Promise<LocalTemplateMetadata> {
        try {
            // 生成ID
            const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 读取文件内容
            const arrayBuffer = await file.arrayBuffer();

            // 保存文件数据
            const fileData = Array.from(new Uint8Array(arrayBuffer));
            localStorage.setItem(`${this.fileStorageKey}_${id}`, JSON.stringify(fileData));

            // 创建完整的元数据
            const fullMetadata: LocalTemplateMetadata = {
                ...metadata,
                id,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                fileSize: file.size
            };

            // 保存元数据
            const templates = await this.getAllTemplates();
            templates.push(fullMetadata);
            localStorage.setItem(this.storageKey, JSON.stringify(templates));

            return fullMetadata;
        } catch (error) {
            console.error('[TemplateStorage] Failed to save template:', error);
            throw error;
        }
    }

    /**
     * 加载模板文件
     */
    async loadTemplateFile(id: string): Promise<ArrayBuffer | null> {
        try {
            const data = localStorage.getItem(`${this.fileStorageKey}_${id}`);
            if (!data) return null;

            const fileData = JSON.parse(data);
            return new Uint8Array(fileData).buffer;
        } catch (error) {
            console.error('[TemplateStorage] Failed to load template file:', error);
            return null;
        }
    }

    /**
     * 删除模板
     */
    async deleteTemplate(id: string): Promise<void> {
        try {
            // 删除文件数据
            localStorage.removeItem(`${this.fileStorageKey}_${id}`);

            // 删除元数据
            const templates = await this.getAllTemplates();
            const filtered = templates.filter(t => t.id !== id);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        } catch (error) {
            console.error('[TemplateStorage] Failed to delete template:', error);
            throw error;
        }
    }

    /**
     * 更新模板元数据
     */
    async updateTemplate(id: string, updates: Partial<LocalTemplateMetadata>): Promise<void> {
        try {
            const templates = await this.getAllTemplates();
            const index = templates.findIndex(t => t.id === id);

            if (index === -1) {
                throw new Error('Template not found');
            }

            templates[index] = {
                ...templates[index],
                ...updates,
                updatedAt: Date.now()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(templates));
        } catch (error) {
            console.error('[TemplateStorage] Failed to update template:', error);
            throw error;
        }
    }
}

export const templateStorage = new TemplateStorage();
