"""
Pyodide 内存压力测试 - 辅助工具

用途：
1. 生成测试用的 Excel 文件
2. 分析测试结果
3. 生成性能报告
4. 对比不同配置的性能

Author: Backend Performance Engineer
Date: 2026-01-24
"""

import pandas as pd
import numpy as np
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False

# ============================================================================
# 测试数据生成器
# ============================================================================

class TestDataGenerator:
    """生成测试用的 Excel 文件"""

    @staticmethod
    def generate_excel(
        rows: int,
        columns: int = 10,
        output_path: str = None,
        sheet_name: str = "Sheet1"
    ) -> str:
        """
        生成测试 Excel 文件

        Args:
            rows: 行数
            columns: 列数
            output_path: 输出路径
            sheet_name: 工作表名称

        Returns:
            生成的文件路径
        """
        print(f"生成 Excel 文件: {rows} 行 x {columns} 列")

        # 生成列名
        columns_list = [f"列{i+1}" for i in range(columns)]

        # 生成数据
        data = {}
        for i, col in enumerate(columns_list):
            if i % 3 == 0:
                # 字符串列
                data[col] = [f"数据_{j}_{i}" for j in range(rows)]
            elif i % 3 == 1:
                # 整数列
                data[col] = np.random.randint(0, 10000, rows)
            else:
                # 小数列
                data[col] = np.random.rand(rows) * 100

        df = pd.DataFrame(data)

        # 保存到文件
        if output_path is None:
            output_path = f"test_data_{rows}rows_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        df.to_excel(output_path, sheet_name=sheet_name, index=False)

        file_size = Path(output_path).stat().st_size / (1024 * 1024)
        print(f"✅ 文件生成完成: {output_path} ({file_size:.2f} MB)")

        return output_path

    @staticmethod
    def generate_test_suite(
        base_dir: str = "test_files",
        sizes: List[Dict[str, int]] = None
    ) -> List[str]:
        """
        生成一套测试文件

        Args:
            base_dir: 基础目录
            sizes: 文件大小配置列表，每个元素包含 rows 和 columns

        Returns:
            生成的文件路径列表
        """
        if sizes is None:
            sizes = [
                {"rows": 25000, "columns": 10},    # 5MB
                {"rows": 75000, "columns": 10},    # 15MB
                {"rows": 150000, "columns": 10},   # 30MB
                {"rows": 250000, "columns": 10},   # 50MB
            ]

        base_path = Path(base_dir)
        base_path.mkdir(exist_ok=True)

        generated_files = []

        for config in sizes:
            rows = config["rows"]
            columns = config.get("columns", 10)

            output_path = base_path / f"test_{rows//1000}K_rows.xlsx"
            file_path = TestDataGenerator.generate_excel(
                rows=rows,
                columns=columns,
                output_path=str(output_path)
            )

            generated_files.append(str(file_path))

        return generated_files

# ============================================================================
# 测试结果分析器
# ============================================================================

class TestResultAnalyzer:
    """分析测试结果"""

    def __init__(self, result_file: str):
        """
        初始化分析器

        Args:
            result_file: 测试结果 JSON 文件路径
        """
        with open(result_file, 'r', encoding='utf-8') as f:
            self.result = json.load(f)

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print("Pyodide 内存压力测试报告")
        print("="*60)
        print(f"测试时间: {self.result['timestamp']}")
        print(f"风险评估: {self.result['riskAssessment']}")
        print("\n--- 测试结果汇总 ---")
        print(f"总测试数: {self.result['summary']['totalTests']}")
        print(f"通过: {self.result['summary']['passed']}")
        print(f"失败: {self.result['summary']['failed']}")
        print(f"崩溃: {self.result['summary']['crashed']}")
        print(f"通过率: {self.result['summary']['passRate']:.1f}%")

    def analyze_memory_usage(self):
        """分析内存使用情况"""
        print("\n--- 内存使用分析 ---")

        for i, test_result in enumerate(self.result['testResults']):
            test_case = test_result['testCase']
            print(f"\n[{i+1}] {test_case['name']}")
            print(f"  文件大小: {test_case['fileSize'] / (1024*1024):.0f} MB")
            print(f"  数据行数: {test_case['rows']:,}")
            print(f"  预期最大内存: {test_case['expectedMaxMemory']} MB")
            print(f"  实际峰值内存: {test_result['actualMaxMemory']:.2f} MB")
            print(f"  内存使用率: {(test_result['actualMaxMemory'] / test_case['expectedMaxMemory'] * 100):.1f}%")
            print(f"  执行时间: {test_result['executionTime']:,} ms")
            print(f"  状态: {'✅ 通过' if test_result['success'] else '❌ 失败'}")

            if test_result.get('error'):
                print(f"  错误: {test_result['error']}")

    def analyze_memory_leak(self):
        """分析内存泄漏情况"""
        leak_analysis = self.result['memoryLeakAnalysis']

        print("\n--- 内存泄漏分析 ---")
        print(f"泄漏检测: {'⚠️ 发现泄漏' if leak_analysis['hasLeak'] else '✅ 无泄漏'}")
        print(f"泄漏速率: {leak_analysis['leakRate']:.2f} MB/文件")
        print(f"严重程度: {leak_analysis['severity'].upper()}")

        if leak_analysis['hasLeak']:
            print("\n🔴 内存泄漏风险评估:")
            severity = leak_analysis['severity']

            if severity == 'low':
                print("  - 轻微泄漏，建议关注但不需要立即处理")
            elif severity == 'medium':
                print("  - 中等泄漏，建议在 Phase 1 中优化")
            elif severity == 'high':
                print("  - 严重泄漏，必须在 Phase 2 启动前修复")
            elif severity == 'critical':
                print("  - 🔴 关键泄漏，强烈建议不进入 Phase 2！")

    def plot_memory_usage(self, output_dir: str = "charts"):
        """绘制内存使用图表"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # 1. 内存使用对比图
        fig, ax = plt.subplots(figsize=(12, 6))

        test_names = []
        actual_memory = []
        expected_memory = []

        for test_result in self.result['testResults']:
            test_case = test_result['testCase']
            test_names.append(test_case['name'])
            actual_memory.append(test_result['actualMaxMemory'])
            expected_memory.append(test_case['expectedMaxMemory'])

        x = np.arange(len(test_names))
        width = 0.35

        bars1 = ax.bar(x - width/2, actual_memory, width, label='实际内存', color='#667eea')
        bars2 = ax.bar(x + width/2, expected_memory, width, label='预期内存', color='#764ba2')

        ax.set_xlabel('测试用例')
        ax.set_ylabel('内存使用 (MB)')
        ax.set_title('Pyodide 内存使用对比')
        ax.set_xticks(x)
        ax.set_xticklabels(test_names, rotation=15, ha='right')
        ax.legend()
        ax.grid(axis='y', alpha=0.3)

        # 添加数值标签
        for bar in bars1:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.0f}',
                   ha='center', va='bottom', fontsize=9)

        for bar in bars2:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:.0f}',
                   ha='center', va='bottom', fontsize=9)

        plt.tight_layout()
        plt.savefig(output_path / 'memory_usage_comparison.png', dpi=300)
        print(f"\n📊 图表已保存: {output_path / 'memory_usage_comparison.png'}")

        # 2. 内存使用率图
        fig, ax = plt.subplots(figsize=(12, 6))

        usage_rates = [
            (actual / expected * 100) if expected > 0 else 0
            for actual, expected in zip(actual_memory, expected_memory)
        ]

        colors = ['#28a745' if rate <= 100 else '#ffc107' if rate <= 120 else '#dc3545'
                 for rate in usage_rates]

        bars = ax.bar(test_names, usage_rates, color=colors)

        ax.set_xlabel('测试用例')
        ax.set_ylabel('内存使用率 (%)')
        ax.set_title('Pyodide 内存使用率（相对于预期）')
        ax.set_xticklabels(test_names, rotation=15, ha='right')
        ax.axhline(y=100, color='gray', linestyle='--', linewidth=1, label='100% 阈值')
        ax.axhline(y=120, color='orange', linestyle='--', linewidth=1, label='120% 容差线')
        ax.legend()
        ax.grid(axis='y', alpha=0.3)

        # 添加数值标签
        for bar, rate in zip(bars, usage_rates):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{rate:.0f}%',
                   ha='center', va='bottom', fontsize=10)

        plt.tight_layout()
        plt.savefig(output_path / 'memory_usage_rate.png', dpi=300)
        print(f"📊 图表已保存: {output_path / 'memory_usage_rate.png'}")

        # 3. 执行时间对比
        fig, ax = plt.subplots(figsize=(12, 6))

        execution_times = [
            test_result['executionTime'] / 1000  # 转换为秒
            for test_result in self.result['testResults']
        ]

        bars = ax.bar(test_names, execution_times, color='#17a2b8')

        ax.set_xlabel('测试用例')
        ax.set_ylabel('执行时间 (秒)')
        ax.set_title('Pyodide 执行时间对比')
        ax.set_xticklabels(test_names, rotation=15, ha='right')
        ax.grid(axis='y', alpha=0.3)

        # 添加数值标签
        for bar, time in zip(bars, execution_times):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{time:.1f}s',
                   ha='center', va='bottom', fontsize=10)

        plt.tight_layout()
        plt.savefig(output_path / 'execution_time.png', dpi=300)
        print(f"📊 图表已保存: {output_path / 'execution_time.png'}")

    def generate_markdown_report(self, output_file: str = "PYODIDE_MEMORY_TEST_REPORT.md"):
        """生成 Markdown 格式的测试报告"""
        lines = []

        # 标题
        lines.append("# Pyodide 内存压力测试报告")
        lines.append("")
        lines.append(f"> **测试日期**: {self.result['timestamp']}")
        lines.append(f"> **风险评估**: {self.result['riskAssessment']}")
        lines.append("")
        lines.append("---")
        lines.append("")

        # 摘要
        lines.append("## 📊 测试摘要")
        lines.append("")
        summary = self.result['summary']
        lines.append(f"- **总测试数**: {summary['totalTests']}")
        lines.append(f"- **通过**: {summary['passed']}")
        lines.append(f"- **失败**: {summary['failed']}")
        lines.append(f"- **崩溃**: {summary['crashed']}")
        lines.append(f"- **通过率**: {summary['passRate']:.1f}%")
        lines.append("")

        # 详细测试结果
        lines.append("## 🔍 详细测试结果")
        lines.append("")

        for i, test_result in enumerate(self.result['testResults']):
            test_case = test_result['testCase']
            lines.append(f"### [{i+1}] {test_case['name']}")
            lines.append("")
            lines.append("| 指标 | 数值 |")
            lines.append("|------|------|")
            lines.append(f"| 文件大小 | {test_case['fileSize'] / (1024*1024):.0f} MB |")
            lines.append(f"| 数据行数 | {test_case['rows']:,} |")
            lines.append(f"| 预期最大内存 | {test_case['expectedMaxMemory']} MB |")
            lines.append(f"| 实际峰值内存 | {test_result['actualMaxMemory']:.2f} MB |")
            lines.append(f"| 内存使用率 | {(test_result['actualMaxMemory'] / test_case['expectedMaxMemory'] * 100):.1f}% |")
            lines.append(f"| 执行时间 | {test_result['executionTime'] / 1000:.2f} 秒 |")
            lines.append(f"| 状态 | {'✅ 通过' if test_result['success'] else '❌ 失败'} |")
            lines.append("")

            if test_result.get('error'):
                lines.append(f"**错误**: {test_result['error']}")
                lines.append("")

        # 内存泄漏分析
        lines.append("## 🔬 内存泄漏分析")
        lines.append("")

        leak = self.result['memoryLeakAnalysis']
        lines.append(f"- **泄漏检测**: {'⚠️ 发现泄漏' if leak['hasLeak'] else '✅ 无泄漏'}")
        lines.append(f"- **泄漏速率**: {leak['leakRate']:.2f} MB/文件")
        lines.append(f"- **严重程度**: {leak['severity'].upper()}")
        lines.append("")

        # 建议
        if self.result['recommendations']:
            lines.append("## 💡 建议")
            lines.append("")

            for rec in self.result['recommendations']:
                lines.append(f"- {rec}")
            lines.append("")

        # 结论
        lines.append("## 🎯 最终结论")
        lines.append("")

        risk = self.result['riskAssessment']

        if risk == 'PASS':
            lines.append("### ✅ PASS - 通过")
            lines.append("")
            lines.append("Pyodide 内存管理表现良好，可以进入 Phase 2 开发。")
        elif risk == 'CONDITIONAL_PASS':
            lines.append("### ⚠️ CONDITIONAL_PASS - 有条件通过")
            lines.append("")
            lines.append("需要实施以下缓解措施后才能进入 Phase 2：")
            lines.append("")
            for rec in self.result['recommendations']:
                lines.append(f"1. {rec.replace('🔴', '').replace('⚠️', '').strip()}")
        else:
            lines.append("### ❌ FAIL - 不通过")
            lines.append("")
            lines.append("存在严重的内存管理问题，强烈建议不进入 Phase 2。")
            lines.append("")
            lines.append("**必须解决的关键问题**：")
            for rec in self.result['recommendations']:
                lines.append(f"- {rec.replace('🔴', '').replace('⚠️', '').strip()}")

        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append(f"**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("**附件**:")
        lines.append("- `charts/memory_usage_comparison.png` - 内存使用对比图")
        lines.append("- `charts/memory_usage_rate.png` - 内存使用率图")
        lines.append("- `charts/execution_time.png` - 执行时间对比图")

        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        print(f"\n📄 Markdown 报告已生成: {output_file}")

# ============================================================================
# 主程序
# ============================================================================

def main():
    """主程序"""
    parser = argparse.ArgumentParser(description='Pyodide 内存压力测试辅助工具')
    parser.add_argument('command', choices=['generate', 'analyze', 'report'],
                       help='命令: generate(生成测试文件), analyze(分析结果), report(生成报告)')
    parser.add_argument('--result', type=str, help='测试结果 JSON 文件路径')
    parser.add_argument('--output-dir', type=str, default='test_files', help='输出目录')
    parser.add_argument('--rows', type=int, help='生成文件的行数')
    parser.add_argument('--columns', type=int, default=10, help='生成文件的列数')

    args = parser.parse_args()

    if args.command == 'generate':
        # 生成测试文件
        if args.rows:
            # 生成单个文件
            TestDataGenerator.generate_excel(
                rows=args.rows,
                columns=args.columns,
                output_path=f"{args.output_dir}/test_{args.rows}rows.xlsx"
            )
        else:
            # 生成整套测试文件
            TestDataGenerator.generate_test_suite(base_dir=args.output_dir)

    elif args.command == 'analyze':
        # 分析测试结果
        if not args.result:
            print("错误: 请使用 --result 参数指定测试结果文件")
            return

        analyzer = TestResultAnalyzer(args.result)
        analyzer.print_summary()
        analyzer.analyze_memory_usage()
        analyzer.analyze_memory_leak()
        analyzer.plot_memory_usage(output_dir=f"{args.output_dir}/charts")

    elif args.command == 'report':
        # 生成报告
        if not args.result:
            print("错误: 请使用 --result 参数指定测试结果文件")
            return

        analyzer = TestResultAnalyzer(args.result)
        analyzer.generate_markdown_report(output_file=f"{args.output_dir}/PYODIDE_MEMORY_TEST_REPORT.md")
        analyzer.plot_memory_usage(output_dir=f"{args.output_dir}/charts")

if __name__ == '__main__':
    main()
