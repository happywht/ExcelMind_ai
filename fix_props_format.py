# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 修复第815行（索引814）
old_line = lines[814]
new_line = '''availableFields={excelData ? Object.keys(excelData.sheets[excelData.currentSheetName]?.[0] || {}) : []}
        generationMode={generationMode}
        aggregateConfig={aggregateConfig}
        onGenerationModeChange={setGenerationMode}
        onAggregateConfigChange={setAggregateConfig}'''

lines[814] = new_line + '\n'

with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed props format!")
