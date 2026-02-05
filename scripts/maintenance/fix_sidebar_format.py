# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到DocumentSpaceSidebar的开始和结束标签
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '<DocumentSpaceSidebar' in line:
        start_idx = i
    if start_idx is not None and line.strip() == '/>':
        end_idx = i
        break

if start_idx and end_idx:
    # 提取DocumentSpaceSidebar组件部分
    sidebar_section = lines[start_idx:end_idx+1]

    # 重新格式化，确保每个prop在单独一行并有正确缩进
    reformatted = []
    for line in sidebar_section:
        stripped = line.strip()
        if stripped and not stripped.startswith('<DocumentSpaceSidebar') and not stripped.startswith('/>'):
            # 这是一个prop，确保它有正确的缩进
            reformatted.append(f'        {stripped}\n')
        else:
            reformatted.append(line)

    # 替换原文件的对应部分
    lines[start_idx:end_idx+1] = reformatted

    with open('components/DocumentSpace/DocumentSpace.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Reformatted DocumentSpaceSidebar component (lines {start_idx+1}-{end_idx+1})")
else:
    print("Could not find DocumentSpaceSidebar component")
