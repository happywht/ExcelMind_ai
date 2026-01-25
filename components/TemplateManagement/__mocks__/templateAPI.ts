/**
 * templateAPI Mock - 用于测试
 */

export const templateAPI = {
  uploadTemplate: jest.fn(),
  listTemplates: jest.fn(),
  getTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  downloadTemplate: jest.fn(),
  validateTemplate: jest.fn(),
  extractPlaceholders: jest.fn(),
};

export * from '../../../api/templateAPI';
