# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

stack = []  # Stack of (position, char)
for i, char in enumerate(content):
    if char == '(':
        stack.append((i, '('))
    elif char == ')':
        if stack:
            open_pos, open_char = stack.pop()
        else:
            print(f"Error: Unmatched ')' at position {i}")
            # Find context
            start = max(0, i-50)
            end = min(len(content), i+50)
            print(f"Context: ...{content[start:end]}...")
            break
    elif char == '{':
        stack.append((i, '{'))
    elif char == '}':
        if stack:
            open_pos, open_char = stack.pop()
        else:
            print(f"Error: Unmatched '}}' at position {i}")
            break

print(f"\nUnclosed brackets ({len(stack)} total):")
for pos, char in stack:
    # Find line number
    line_num = content[:pos].count('\n') + 1
    # Find context
    start = max(0, pos-30)
    end = min(len(content), pos+30)
    print(f"  Line {line_num}, pos {pos}, char '{char}': ...{content[start:end]}...")
