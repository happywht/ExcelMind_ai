# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpaceSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复第335行的GenerationModeSelector格式
old_text = """{/* Generation Mode Selector */}        {mappingScheme && (          <GenerationModeSelector            mode={generationMode}            aggregateConfig={aggregateConfig}            availableFields={availableFields}            onModeChange={onGenerationModeChange}            onAggregateConfigChange={onAggregateConfigChange}            disabled={isProcessing}          />        )}"""

new_text = """{/* Generation Mode Selector */}
        {mappingScheme && (
          <GenerationModeSelector
            mode={generationMode}
            aggregateConfig={aggregateConfig}
            availableFields={availableFields}
            onModeChange={onGenerationModeChange}
            onAggregateConfigChange={onAggregateConfigChange}
            disabled={isProcessing}
          />
        )}"""

if old_text in content:
    content = content.replace(old_text, new_text)
    with open('components/DocumentSpace/DocumentSpaceSidebar.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed GenerationModeSelector formatting!")
else:
    print("Could not find the exact text to replace")
    print("Searching for GenerationModeSelector...")
    if 'GenerationModeSelector' in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'GenerationModeSelector' in line:
                print(f"Found at line {i+1}: {repr(line[:100])}")
