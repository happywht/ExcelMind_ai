# -*- coding: utf-8 -*-

print("Checking DocumentSpace props...")

# 读取DocumentSpace.tsx
with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    ds_content = f.read()

# 读取DocumentSpaceSidebar.tsx
with open('components/DocumentSpace/DocumentSpaceSidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_content = f.read()

# 提取DocumentSpaceSidebar接口
import re
interface_match = re.search(
    r'interface DocumentSpaceSidebarProps\s*{([^}]+)}',
    sidebar_content,
    re.DOTALL
)

if interface_match:
    interface_text = interface_match.group(1)
    props = re.findall(r'(\w+)\s*:', interface_text)
    print("\n=== DocumentSpaceSidebar Interface Props ===")
    for i, prop in enumerate(props, 1):
        print(f"{i}. {prop}")

# 提取传递的props
sidebar_section_match = re.search(
    r'<DocumentSpaceSidebar\s*(.*?)\s*/>',
    ds_content,
    re.DOTALL
)

if sidebar_section_match:
    props_text = sidebar_section_match.group(1)
    passed_props = re.findall(r'(\w+)={', props_text)
    print("\n=== Passed Props from DocumentSpace ===")
    for i, prop in enumerate(passed_props, 1):
        print(f"{i}. {prop}")

    # 检查是否有props缺失
    if set(props) != set(passed_props):
        print("\n=== Mismatch Found ===")
        missing = set(props) - set(passed_props)
        extra = set(passed_props) - set(props)
        if missing:
            print(f"Missing props: {missing}")
        if extra:
            print(f"Extra props: {extra}")
    else:
        print("\n✓ All props match!")

# 检查第814行周围的代码
lines = ds_content.split('\n')
print(f"\n=== Line 814 Context ===")
for i in range(812, min(817, len(lines))):
    print(f"{i+1}: {lines[i]}")
