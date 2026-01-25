# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpaceSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复第63行的接口定义格式
old_line = 'generationMode: GenerationMode;  aggregateConfig: AggregateConfig;  availableFields: string[];  onGenerationModeChange: (mode: GenerationMode) => void;  onAggregateConfigChange: (config: AggregateConfig) => void;'
new_lines = '''  generationMode: GenerationMode;
  aggregateConfig: AggregateConfig;
  availableFields: string[];
  onGenerationModeChange: (mode: GenerationMode) => void;
  onAggregateConfigChange: (config: AggregateConfig) => void;'''

content = content.replace(old_line, new_lines)

with open('components/DocumentSpace/DocumentSpaceSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed interface definition!")
