# MultiSheetDataSource 单元测试示例

## 测试环境设置

```typescript
import { MultiSheetDataSource } from './MultiSheetDataSource';

// 创建测试数据
function createTestExcelData() {
  return {
    sheets: {
      "员工信息": [
        { 员工ID: 1, 姓名: "张三", 部门: "销售部", 入职日期: "2020-01-15" },
        { 员工ID: 2, 姓名: "李四", 部门: "市场部", 入职日期: "2019-06-20" },
        { 员工ID: 3, 姓名: "王五", 部门: "销售部", 入职日期: "2021-03-10" },
        { 员工ID: 4, 姓名: "赵六", 部门: "技术部", 入职日期: "2020-08-05" }
      ],
      "销售记录": [
        { 记录ID: 101, 员工ID: 1, 销售额: 50000, 日期: "2024-01-01" },
        { 记录ID: 102, 员工ID: 1, 销售额: 75000, 日期: "2024-01-15" },
        { 记录ID: 103, 员工ID: 3, 销售额: 60000, 日期: "2024-01-20" },
        { 记录ID: 104, 员工ID: 3, 销售额: 90000, 日期: "2024-02-01" }
      ],
      "部门预算": [
        { 部门: "销售部", 预算: 1000000, 负责人: "钱七" },
        { 部门: "市场部", 预算: 800000, 负责人: "孙八" },
        { 部门: "技术部", 预算: 1200000, 负责人: "周九" }
      ]
    },
    currentSheetName: "员工信息"
  };
}
```

## 测试用例

### 1. 数据加载测试

```typescript
describe('MultiSheetDataSource - 数据加载', () => {
  test('应该成功加载Excel数据', () => {
    const dataSource = new MultiSheetDataSource();
    const excelData = createTestExcelData();

    dataSource.loadExcelData(excelData);

    // 验证Sheet数量
    const sheetNames = dataSource.getSheetNames();
    expect(sheetNames).toHaveLength(3);
    expect(sheetNames).toContain("员工信息");
    expect(sheetNames).toContain("销售记录");
    expect(sheetNames).toContain("部门预算");
  });

  test('应该正确设置当前Sheet的优先级', () => {
    const dataSource = new MultiSheetDataSource();
    const excelData = createTestExcelData();

    dataSource.loadExcelData(excelData);

    // 当前Sheet应该能够优先被找到
    const sheet = dataSource.findSheetByColumn("姓名");
    expect(sheet).toBe("员工信息");
  });

  test('应该拒绝空数据', () => {
    const dataSource = new MultiSheetDataSource();

    expect(() => {
      dataSource.loadExcelData({ sheets: {}, currentSheetName: "" });
    }).toThrow('Excel数据中没有Sheet');
  });
});
```

### 2. Sheet信息查询测试

```typescript
describe('MultiSheetDataSource - Sheet信息查询', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该返回所有Sheet名称', () => {
    const sheetNames = dataSource.getSheetNames();
    expect(sheetNames).toEqual(expect.arrayContaining([
      "员工信息",
      "销售记录",
      "部门预算"
    ]));
  });

  test('应该返回指定Sheet的列名', () => {
    const columns = dataSource.getColumns("员工信息");
    expect(columns).toEqual(["员工ID", "姓名", "部门", "入职日期"]);
  });

  test('应该抛出错误当Sheet不存在时', () => {
    expect(() => {
      dataSource.getColumns("不存在的Sheet");
    }).toThrow('Sheet不存在: 不存在的Sheet');
  });

  test('应该返回Sheet元数据', () => {
    const metadata = dataSource.getSheetMetadata("员工信息");

    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe("员工信息");
    expect(metadata?.rowCount).toBe(4);
    expect(metadata?.columnCount).toBe(4);
    expect(metadata?.hasPrimaryKey).toBe(true);
    expect(metadata?.primaryKeys).toContain("员工ID");
  });

  test('应该检查Sheet是否存在', () => {
    expect(dataSource.hasSheet("员工信息")).toBe(true);
    expect(dataSource.hasSheet("不存在的Sheet")).toBe(false);
  });
});
```

### 3. 列名冲突检测测试

```typescript
describe('MultiSheetDataSource - 列名冲突检测', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该检测到跨Sheet的同名列', () => {
    const conflicts = dataSource.detectColumnConflicts();

    // "部门" 列存在于 "员工信息" 和 "部门预算"
    const departmentConflict = conflicts.find(c => c.columnName === "部门");
    expect(departmentConflict).toBeDefined();
    expect(departmentConflict?.sheets).toContain("员工信息");
    expect(departmentConflict?.sheets).toContain("部门预算");
  });

  test('应该提供冲突解决建议', () => {
    const conflicts = dataSource.detectColumnConflicts();

    conflicts.forEach(conflict => {
      expect(['prefix', 'qualify', 'alias']).toContain(conflict.suggestedResolution);
      expect(conflict.recommendedPrefix).toBeDefined();
    });
  });

  test('应该推荐当前Sheet作为前缀', () => {
    const conflicts = dataSource.detectColumnConflicts();

    // "员工信息" 是当前Sheet，应该被推荐为前缀
    conflicts.forEach(conflict => {
      if (conflict.sheets.includes("员工信息")) {
        expect(conflict.recommendedPrefix).toBe("员工信息");
      }
    });
  });
});
```

### 4. 表间关系检测测试

```typescript
describe('MultiSheetDataSource - 表间关系检测', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该自动检测基于共同字段的关系', () => {
    const relationships = dataSource.detectRelationships();

    expect(relationships.length).toBeGreaterThan(0);

    // 应该检测到 员工信息.员工ID -> 销售记录.员工ID
    const employeeRelation = relationships.find(
      r => r.fromSheet === "员工信息" &&
           r.toSheet === "销售记录" &&
           r.fromColumn === "员工ID"
    );

    expect(employeeRelation).toBeDefined();
  });

  test('应该正确识别关系类型', () => {
    const relationships = dataSource.detectRelationships();

    relationships.forEach(rel => {
      expect(['one-to-one', 'one-to-many', 'many-to-many']).toContain(rel.type);
    });
  });

  test('应该计算关系可信度', () => {
    const relationships = dataSource.detectRelationships();

    relationships.forEach(rel => {
      expect(rel.confidence).toBeGreaterThanOrEqual(0);
      expect(rel.confidence).toBeLessThanOrEqual(1);
    });
  });

  test('应该识别包含ID字段的强关系', () => {
    const relationships = dataSource.detectRelationships();

    const idRelation = relationships.find(r => r.fromColumn === "员工ID");

    expect(idRelation).toBeDefined();
    expect(idRelation?.confidence).toBeGreaterThan(0.7); // ID字段应该有较高可信度
  });
});
```

### 5. 关系路径查找测试

```typescript
describe('MultiSheetDataSource - 关系路径查找', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该找到直接关系路径', () => {
    const paths = dataSource.getRelationshipPath("员工信息", "销售记录");

    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].path.length).toBe(1); // 直接关系，路径长度为1
    expect(paths[0].path[0].fromSheet).toBe("员工信息");
    expect(paths[0].path[0].toSheet).toBe("销售记录");
  });

  test('应该找到间接关系路径', () => {
    const paths = dataSource.getRelationshipPath("销售记录", "部门预算");

    // 销售记录 -> 员工信息 (通过员工ID) -> 部门预算 (通过部门)
    expect(paths.length).toBeGreaterThan(0);

    const indirectPath = paths.find(p => p.path.length > 1);
    expect(indirectPath).toBeDefined();
  });

  test('应该按可信度排序路径', () => {
    const paths = dataSource.getRelationshipPath("员工信息", "部门预算");

    if (paths.length > 1) {
      // 路径应该按可信度降序排列
      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].confidence).toBeGreaterThanOrEqual(paths[i + 1].confidence);
      }
    }
  });

  test('应该对不存在的Sheet返回空数组', () => {
    const paths = dataSource.getRelationshipPath("不存在的Sheet", "部门预算");
    expect(paths).toEqual([]);
  });
});
```

### 6. 智能字段查找测试

```typescript
describe('MultiSheetDataSource - 智能字段查找', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该精确匹配字段名', () => {
    const sheet = dataSource.findSheetByColumn("姓名");
    expect(sheet).toBe("员工信息");
  });

  test('应该处理模糊匹配', () => {
    // 测试部分匹配
    const sheet = dataSource.findSheetByColumn("员工");
    expect(sheet).toBeTruthy(); // 应该能匹配到 "员工ID"
  });

  test('应该根据优先级解决冲突', () => {
    // "部门" 存在于多个Sheet，应该返回优先级最高的
    const sheet = dataSource.findSheetByColumn("部门");
    expect(["员工信息", "部门预算"]).toContain(sheet);
  });

  test('应该对不存在的字段返回null', () => {
    const sheet = dataSource.findSheetByColumn("不存在的字段");
    expect(sheet).toBeNull();
  });
});
```

### 7. 共同字段查找测试

```typescript
describe('MultiSheetDataSource - 共同字段查找', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该找到两个Sheet的共同字段', () => {
    const commonColumns = dataSource.findCommonColumns("员工信息", "销售记录");

    expect(commonColumns).toContain("员工ID");
  });

  test('应该对没有共同字段的Sheet返回空数组', () => {
    // 添加一个新Sheet，没有共同字段
    dataSource.registerSheet("独立数据", [{ 独立字段: "值" }]);

    const commonColumns = dataSource.findCommonColumns("独立数据", "员工信息");
    expect(commonColumns).toHaveLength(0);
  });
});
```

### 8. 数据统计测试

```typescript
describe('MultiSheetDataSource - 数据统计', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该返回正确的统计信息', () => {
    const stats = dataSource.getStatistics();

    expect(stats.sheetCount).toBe(3);
    expect(stats.totalRows).toBe(11); // 4 + 4 + 3
    expect(stats.totalColumns).toBeGreaterThan(0);
    expect(stats.relationshipCount).toBeGreaterThan(0);
    expect(stats.conflictCount).toBeGreaterThanOrEqual(0);
  });

  test('应该生成人类可读的摘要报告', () => {
    const report = dataSource.generateSummaryReport();

    expect(report).toContain('MultiSheet数据源摘要');
    expect(report).toContain('Sheet数量: 3');
    expect(report).toContain('员工信息');
    expect(report).toContain('销售记录');
    expect(report).toContain('部门预算');
  });

  test('应该导出为JSON', () => {
    const json = dataSource.toJSON();

    expect(json).toHaveProperty('sheets');
    expect(json).toHaveProperty('relationships');
    expect(json).toHaveProperty('statistics');
    expect(json).toHaveProperty('conflicts');

    expect(json.sheets).toHaveLength(3);
  });
});
```

### 9. 手动关系创建测试

```typescript
describe('MultiSheetDataSource - 手动关系创建', () => {
  let dataSource: MultiSheetDataSource;

  beforeEach(() => {
    dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());
  });

  test('应该成功创建关系', () => {
    dataSource.createRelationship("员工信息", "销售记录", "员工ID", "one-to-many");

    const relationships = dataSource.getRelationships();
    const newRelation = relationships.find(
      r => r.fromSheet === "员工信息" &&
           r.toSheet === "销售记录" &&
           r.fromColumn === "员工ID"
    );

    expect(newRelation).toBeDefined();
    expect(newRelation?.type).toBe("one-to-many");
  });

  test('应该拒绝不存在的Sheet的关系', () => {
    expect(() => {
      dataSource.createRelationship("不存在的Sheet", "销售记录", "员工ID");
    }).toThrow('无法创建关系：Sheet不存在');
  });
});
```

### 10. 清空数据测试

```typescript
describe('MultiSheetDataSource - 清空数据', () => {
  test('应该清空所有数据', () => {
    const dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());

    // 验证数据已加载
    expect(dataSource.getSheetNames().length).toBeGreaterThan(0);

    // 清空数据
    dataSource.clear();

    // 验证数据已清空
    expect(dataSource.getSheetNames().length).toBe(0);
    expect(dataSource.getRelationships().length).toBe(0);
  });
});
```

### 11. 边界情况测试

```typescript
describe('MultiSheetDataSource - 边界情况', () => {
  test('应该处理空Sheet', () => {
    const dataSource = new MultiSheetDataSource();

    const excelData = {
      sheets: {
        "空Sheet": [],
        "正常Sheet": [{ ID: 1, 名称: "测试" }]
      },
      currentSheetName: "正常Sheet"
    };

    expect(() => {
      dataSource.loadExcelData(excelData);
    }).not.toThrow();

    // 空Sheet不应该被注册
    expect(dataSource.hasSheet("空Sheet")).toBe(false);
    expect(dataSource.hasSheet("正常Sheet")).toBe(true);
  });

  test('应该处理单行数据', () => {
    const dataSource = new MultiSheetDataSource();

    const excelData = {
      sheets: {
        "单行Sheet": [{ ID: 1, 名称: "只有一行" }]
      },
      currentSheetName: "单行Sheet"
    };

    dataSource.loadExcelData(excelData);

    expect(dataSource.hasSheet("单行Sheet")).toBe(true);
    const metadata = dataSource.getSheetMetadata("单行Sheet");
    expect(metadata?.rowCount).toBe(1);
  });

  test('应该处理特殊字符列名', () => {
    const dataSource = new MultiSheetDataSource();

    const excelData = {
      sheets: {
        "特殊列名": [
          { "列-名": "值", "列 名": "值2", "列.名": "值3" }
        ]
      },
      currentSheetName: "特殊列名"
    };

    expect(() => {
      dataSource.loadExcelData(excelData);
    }).not.toThrow();

    const columns = dataSource.getColumns("特殊列名");
    expect(columns).toContain("列-名");
    expect(columns).toContain("列 名");
    expect(columns).toContain("列.名");
  });
});
```

### 12. 性能测试（可选）

```typescript
describe('MultiSheetDataSource - 性能测试', () => {
  test('应该快速加载大量数据', () => {
    const dataSource = new MultiSheetDataSource();

    // 创建大量测试数据
    const largeData = { sheets: {}, currentSheetName: "Sheet1" };

    for (let i = 1; i <= 1000; i++) {
      largeData.sheets[`Sheet${i}`] = [
        { ID: 1, 名称: "测试", 值: Math.random() }
      ];
    }

    const startTime = Date.now();
    dataSource.loadExcelData(largeData);
    const endTime = Date.now();

    // 应该在合理时间内完成（例如5秒）
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('应该快速检测关系', () => {
    const dataSource = new MultiSheetDataSource();
    dataSource.loadExcelData(createTestExcelData());

    const startTime = Date.now();
    const relationships = dataSource.detectRelationships();
    const endTime = Date.now();

    expect(relationships.length).toBeGreaterThan(0);
    // 应该快速完成（例如100ms）
    expect(endTime - startTime).toBeLessThan(100);
  });
});
```

## 测试运行示例

```typescript
// 使用 Jest 运行测试
// npm test -- MultiSheetDataSource.test

// 或者使用 Vitest
// npm run test

// 覆盖率报告
// npm run test:coverage
```

## 预期测试覆盖率

- 语句覆盖率: > 90%
- 分支覆盖率: > 85%
- 函数覆盖率: > 95%
- 行覆盖率: > 90%

## 测试最佳实践

1. **隔离性**: 每个测试应该独立，使用 `beforeEach` 重置状态
2. **可读性**: 使用描述性的测试名称
3. **完整性**: 覆盖正常流程和边界情况
4. **性能**: 避免过慢的测试，必要时使用模拟数据
5. **维护性**: 当API变化时，及时更新测试
