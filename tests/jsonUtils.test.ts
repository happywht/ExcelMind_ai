import { parseLLMJson } from '../services/utils/jsonUtils';

describe('Robust JSON Parsing', () => {
    test('should parse standard JSON', () => {
        const json = '{"key": "value"}';
        expect(parseLLMJson(json)).toEqual({ key: 'value' });
    });

    test('should parse JSON with markdown code blocks', () => {
        const json = '```json\n{"key": "value"}\n```';
        expect(parseLLMJson(json)).toEqual({ key: 'value' });
    });

    test('should parse JSON with trailing commas', () => {
        const json = '{"key": "value",}';
        expect(parseLLMJson(json)).toEqual({ key: 'value' });
    });

    test('should parse JSON with comments', () => {
        const json = `
      {
        "key": "value" // This is a comment
      }
    `;
        expect(parseLLMJson(json)).toEqual({ key: 'value' });
    });

    test('should handle unquoted keys (fallback)', () => {
        const json = '{key: "value"}';
        expect(parseLLMJson(json)).toEqual({ key: 'value' });
    });
});
