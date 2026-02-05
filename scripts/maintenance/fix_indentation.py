# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 修复第814行（索引813）- 添加缺失的缩进
if 'enabledSheets={enabledSheets},' in lines[813]:
    lines[813] = '        enabledSheets={enabledSheets},\n'
    print("Fixed line 814: added indentation")
else:
    print(f"Line 814 content: {repr(lines[813])}")

with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done!")
