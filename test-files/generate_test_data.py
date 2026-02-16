"""
生成测试用的Excel文件
用于测试多步分析和自我修复系统
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# 确保输出目录存在
output_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(output_dir, exist_ok=True)

# ============================================
# 测试文件1: 简单销售数据（基础功能测试）
# ============================================
print("正在生成 test-simple.xlsx...")

simple_data = {
    '日期': pd.date_range('2024-01-01', periods=10, freq='D'),
    '产品': ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A'],
    '销售额': [1000, 1500, 1200, 1100, 1600, 1300, 1050, 1550, 1250, 1080],
    '数量': [10, 15, 12, 11, 16, 13, 10.5, 15.5, 12.5, 10.8],
    '单价': [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
}

df_simple = pd.DataFrame(simple_data)
df_simple.to_excel(os.path.join(output_dir, 'test-simple.xlsx'), index=False, sheet_name='销售数据')
print("[OK] test-simple.xlsx generated")

# ============================================
# 测试文件2: 复杂多Sheet数据（错误修复测试）
# ============================================
print("正在生成 test-complex.xlsx...")

# Sheet 1: 包含错误数据
sheet1_data = {
    '员工ID': ['E001', 'E002', 'E003', 'E004', 'E005', 'E006', 'E007', 'E008'],
    '姓名': ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'],
    '部门': ['销售', '技术', '销售', '技术', '人事', None, '销售', '技术'],  # 包含空值
    '基本工资': [8000, 12000, 8500, 13000, 7000, 9000, 8200, 12500],
    '奖金': [2000, 3000, 2500, None, 1500, 2000, 2200, 3100],  # 包含空值
    '入职日期': [
        '2020-01-15', '2019-06-20', '2021-03-10',
        '2018-11-05', '2022-07-01', '2020-09-15',
        '2021-01-20', '2019-04-12'
    ]
}

# Sheet 2: 部门预算
sheet2_data = {
    '部门': ['销售', '技术', '人事', '财务', '市场'],
    '年度预算': [500000, 800000, 300000, 400000, 600000],
    '已使用': [250000, 450000, 150000, 200000, 350000],
    '剩余预算': [250000, 350000, 150000, 200000, 250000]
}

# Sheet 3: 考勤记录
sheet3_data = {
    '员工ID': ['E001', 'E002', 'E003', 'E004', 'E005'],
    '一月份出勤': [22, 21, 22, 20, 22],
    '二月份出勤': [20, 21, 22, 21, 22],
    '三月份出勤': [22, 20, 21, 22, 21]
}

with pd.ExcelWriter(os.path.join(output_dir, 'test-complex.xlsx'), engine='openpyxl') as writer:
    pd.DataFrame(sheet1_data).to_excel(writer, sheet_name='员工信息', index=False)
    pd.DataFrame(sheet2_data).to_excel(writer, sheet_name='部门预算', index=False)
    pd.DataFrame(sheet3_data).to_excel(writer, sheet_name='考勤记录', index=False)

print("[OK] test-complex.xlsx generated (3 sheets)")

# ============================================
# 测试文件3: 边界情况数据（质量评估测试）
# ============================================
print("正在生成 test-edge.xlsx...")

edge_data = {
    'ID': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    '名称': ['产品A', '产品B', None, '产品D', '产品E', '产品F', '产品G', '产品H', '产品I', '产品J', '产品K', '产品L'],  # 包含空值
    '库存': [100, 200, 150, None, 180, 220, -50, 190, 210, 170, 205, 195],  # 包含空值和负值
    '单价': [50.5, 75.2, None, 88.9, 65.3, 92.1, 0, 78.4, 82.6, 71.8, 85.9, 79.3],  # 包含空值和0
    '分类': ['A', 'B', 'A', 'C', 'B', 'A', 'Invalid', 'C', 'B', 'A', 'C', 'B']  # 包含无效值
}

df_edge = pd.DataFrame(edge_data)
df_edge.to_excel(os.path.join(output_dir, 'test-edge.xlsx'), index=False, sheet_name='库存数据')
print("[OK] test-edge.xlsx generated (edge cases)")

# ============================================
# 测试文件4: 审计数据（实际业务场景）
# ============================================
print("正在生成 test-audit.xlsx...")

# 生成模拟的财务审计数据
np.random.seed(42)
n_records = 50

audit_data = {
    '凭证号': [f'PZ{i:04d}' for i in range(1, n_records + 1)],
    '日期': [datetime(2024, 1, 1) + timedelta(days=np.random.randint(0, 90)) for _ in range(n_records)],
    '科目代码': [np.random.choice(['1001', '1002', '1003', '2001', '2002', '5001', '5002']) for _ in range(n_records)],
    '科目名称': [
        np.random.choice(['库存现金', '银行存款', '应收账款', '应付账款', '短期借款',
                        '主营业务收入', '主营业务成本'])
        for _ in range(n_records)
    ],
    '借方金额': [round(np.random.uniform(0, 50000), 2) if np.random.random() > 0.5 else 0 for _ in range(n_records)],
    '贷方金额': [round(np.random.uniform(0, 50000), 2) if np.random.random() > 0.5 else 0 for _ in range(n_records)],
    '摘要': [
        np.random.choice(['采购', '销售', '付款', '收款', '转账', '提现', '存现'])
        for _ in range(n_records)
    ],
    '制单人': [np.random.choice(['张三', '李四', '王五']) for _ in range(n_records)]
}

df_audit = pd.DataFrame(audit_data)
df_audit.to_excel(os.path.join(output_dir, 'test-audit.xlsx'), index=False, sheet_name='凭证表')

print("[OK] test-audit.xlsx generated (audit data)")

# ============================================
# 测试文件5: 数据聚合测试（多Sheet关联）
# ============================================
print("正在生成 test-aggregation.xlsx...")

# Sheet 1: 订单
orders_data = {
    '订单号': [f'ORD{i:04d}' for i in range(1, 21)],
    '客户ID': [f'C{np.random.randint(1, 6):03d}' for _ in range(20)],
    '产品ID': [f'P{np.random.randint(1, 11):03d}' for _ in range(20)],
    '订单日期': [datetime(2024, 1, 1) + timedelta(days=np.random.randint(0, 60)) for _ in range(20)],
    '数量': [np.random.randint(1, 10) for _ in range(20)],
    '单价': [round(np.random.uniform(50, 500), 2) for _ in range(20)]
}

# Sheet 2: 客户信息
customers_data = {
    '客户ID': [f'C{i:03d}' for i in range(1, 6)],
    '客户名称': ['客户A', '客户B', '客户C', '客户D', '客户E'],
    '地区': ['华东', '华北', '华南', '华东', '华北'],
    '行业': ['制造', '金融', '零售', '制造', '金融']
}

# Sheet 3: 产品信息
products_data = {
    '产品ID': [f'P{i:03d}' for i in range(1, 11)],
    '产品名称': [f'产品{i}' for i in range(1, 11)],
    '类别': [np.random.choice(['电子', '家具', '办公用品']) for _ in range(10)],
    '成本': [round(np.random.uniform(30, 300), 2) for _ in range(10)]
}

with pd.ExcelWriter(os.path.join(output_dir, 'test-aggregation.xlsx'), engine='openpyxl') as writer:
    pd.DataFrame(orders_data).to_excel(writer, sheet_name='订单', index=False)
    pd.DataFrame(customers_data).to_excel(writer, sheet_name='客户', index=False)
    pd.DataFrame(products_data).to_excel(writer, sheet_name='产品', index=False)

print("[OK] test-aggregation.xlsx generated (3 related sheets)")

# ============================================
# 打印总结
# ============================================
print("\n" + "=" * 60)
print("[SUCCESS] All test files generated!")
print("=" * 60)
print("\nGenerated files:")
print("1. test-simple.xlsx      - Simple sales data (basic test)")
print("2. test-complex.xlsx     - Multi-sheet complex data (error repair)")
print("3. test-edge.xlsx        - Edge cases (quality assessment)")
print("4. test-audit.xlsx       - Financial audit data (real scenario)")
print("5. test-aggregation.xlsx - Data aggregation (multi-sheet join)")
print("\nLocation:", output_dir)
print("=" * 60)
