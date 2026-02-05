# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复第814行 - 确保添加逗号
content = content.replace(
    '        enabledSheets={enabledSheets}\navailableFields=',
    '        enabledSheets={enabledSheets},\n        availableFields='
)

with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed: Added comma after enabledSheets prop!")
