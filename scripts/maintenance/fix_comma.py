# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 修复第814行（索引813）- 添加逗号
lines[813] = '        enabledSheets={enabledSheets}\n'

with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Added comma to line 814!")
