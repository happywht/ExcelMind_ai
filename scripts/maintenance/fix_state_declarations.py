# -*- coding: utf-8 -*-

# Read the file
with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the duplicate and broken state declarations
old_text = '''  // 多Sheet支持状态
// 生成模式状态  const [generationMode, setGenerationMode] = useState<GenerationMode>("individual");  const [aggregateConfig, setAggregateConfig] = useState<AggregateConfig>({ rules: [] });
// 生成模式状态  const [generationMode, setGenerationMode] = useState<GenerationMode>('individual');  const [aggregateConfig, setAggregateConfig] = useState<AggregateConfig>({ rules: [] });
  const [primarySheet, setPrimarySheet] = useState<string>('');
  const [enabledSheets, setEnabledSheets] = useState<string[]>([]);'''

new_text = '''  // 多Sheet支持状态
  const [primarySheet, setPrimarySheet] = useState<string>('');
  const [enabledSheets, setEnabledSheets] = useState<string[]>([]);

  // 生成模式状态
  const [generationMode, setGenerationMode] = useState<GenerationMode>('individual');
  const [aggregateConfig, setAggregateConfig] = useState<AggregateConfig>({ rules: [] });'''

if old_text in content:
    content = content.replace(old_text, new_text)
    print("Fixed state declarations successfully")
else:
    print("Warning: Could not find exact match, trying alternative approach")
    # Try removing the duplicate line
    lines = content.split('\n')
    filtered_lines = []
    skip_next = False
    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue
        if '// 生成模式状态  const [generationMode, setGenerationMode]' in line and i > 76:
            # This is the duplicate line, skip it
            continue
        filtered_lines.append(line)
    content = '\n'.join(filtered_lines)

# Write back
with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("State declaration fix complete!")
