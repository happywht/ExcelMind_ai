/**
 * Query Examples - 查询示例库
 *
 * 包含100+个高质量查询示例，覆盖各种SQL查询场景
 * 用于Few-Shot Learning引擎的训练和检索
 *
 * @module QueryExamples
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 查询类型
 */
export type QueryType = 'simple' | 'aggregate' | 'join' | 'complex';

/**
 * 难度级别
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * 示例来源
 */
export type ExampleSource = 'manual' | 'generated' | 'user';

/**
 * 查询示例
 */
export interface QueryExample {
  /** 示例ID */
  id: string;

  /** 自然语言查询 */
  naturalQuery: string;

  /** SQL查询 */
  sqlQuery: string;

  /** 查询类型 */
  queryType: QueryType;

  /** 查询意图 */
  intent: string;

  /** 涉及的字段 */
  fields: string[];

  /** 查询条件 */
  conditions?: string[];

  /** 推理步骤（用于Chain-of-Thought） */
  reasoningSteps?: string[];

  /** 难度级别 */
  difficulty: DifficultyLevel;

  /** 标签（用于检索） */
  tags: string[];

  /** 示例来源 */
  source: ExampleSource;
}

// ============================================================================
// 基础查询示例（30个）
// ============================================================================

/**
 * 简单SELECT示例（10个）
 */
export const simpleSelectExamples: QueryExample[] = [
  {
    id: 'simple_select_001',
    naturalQuery: '查询所有员工的信息',
    sqlQuery: 'SELECT * FROM employees;',
    queryType: 'simple',
    intent: '获取所有记录',
    fields: ['employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取员工表的所有数据',
      '确定操作：SELECT * 选择所有列',
      '确定表：FROM employees'
    ],
    difficulty: 'beginner',
    tags: ['select', 'all', 'employees'],
    source: 'manual'
  },
  {
    id: 'simple_select_002',
    naturalQuery: '只查询员工的姓名和邮箱',
    sqlQuery: 'SELECT name, email FROM employees;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['name', 'email', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：只获取员工的姓名和邮箱',
      '确定字段：name, email',
      '确定表：FROM employees'
    ],
    difficulty: 'beginner',
    tags: ['select', 'specific', 'fields'],
    source: 'manual'
  },
  {
    id: 'simple_select_003',
    naturalQuery: '显示产品的名称和价格',
    sqlQuery: 'SELECT product_name, price FROM products;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['product_name', 'price', 'products'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'products', 'price'],
    source: 'manual'
  },
  {
    id: 'simple_select_004',
    naturalQuery: '查询客户的姓名和电话号码',
    sqlQuery: 'SELECT customer_name, phone FROM customers;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['customer_name', 'phone', 'customers'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'customers', 'contact'],
    source: 'manual'
  },
  {
    id: 'simple_select_005',
    naturalQuery: '列出所有订单的订单号和订单日期',
    sqlQuery: 'SELECT order_id, order_date FROM orders;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['order_id', 'order_date', 'orders'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'orders', 'date'],
    source: 'manual'
  },
  {
    id: 'simple_select_006',
    naturalQuery: '查询员工的ID、姓名和部门',
    sqlQuery: 'SELECT employee_id, name, department FROM employees;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['employee_id', 'name', 'department', 'employees'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'employees', 'department'],
    source: 'manual'
  },
  {
    id: 'simple_select_007',
    naturalQuery: '显示产品名称、类别和库存数量',
    sqlQuery: 'SELECT product_name, category, stock_quantity FROM products;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['product_name', 'category', 'stock_quantity', 'products'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'products', 'inventory'],
    source: 'manual'
  },
  {
    id: 'simple_select_008',
    naturalQuery: '查询客户的ID、姓名和地址',
    sqlQuery: 'SELECT customer_id, customer_name, address FROM customers;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['customer_id', 'customer_name', 'address', 'customers'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'customers', 'address'],
    source: 'manual'
  },
  {
    id: 'simple_select_009',
    naturalQuery: '列出所有部门的名称',
    sqlQuery: 'SELECT department_name FROM departments;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['department_name', 'departments'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'departments', 'name'],
    source: 'manual'
  },
  {
    id: 'simple_select_010',
    naturalQuery: '查询订单的订单号、客户ID和总金额',
    sqlQuery: 'SELECT order_id, customer_id, total_amount FROM orders;',
    queryType: 'simple',
    intent: '获取特定字段',
    fields: ['order_id', 'customer_id', 'total_amount', 'orders'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['select', 'orders', 'amount'],
    source: 'manual'
  }
];

/**
 * WHERE条件示例（10个）
 */
export const whereConditionExamples: QueryExample[] = [
  {
    id: 'where_001',
    naturalQuery: '查询姓名为"张三"的员工信息',
    sqlQuery: "SELECT * FROM employees WHERE name = '张三';",
    queryType: 'simple',
    intent: '精确匹配',
    fields: ['name', 'employees'],
    conditions: ["name = '张三'"],
    reasoningSteps: [
      '识别需求：查找特定姓名的员工',
      '确定表：employees',
      '确定条件：WHERE name = "张三"'
    ],
    difficulty: 'beginner',
    tags: ['where', 'equals', 'filter'],
    source: 'manual'
  },
  {
    id: 'where_002',
    naturalQuery: '查询年龄大于30岁的员工',
    sqlQuery: 'SELECT * FROM employees WHERE age > 30;',
    queryType: 'simple',
    intent: '数值比较',
    fields: ['age', 'employees'],
    conditions: ['age > 30'],
    difficulty: 'beginner',
    tags: ['where', 'greater_than', 'age'],
    source: 'manual'
  },
  {
    id: 'where_003',
    naturalQuery: '查找价格低于100元的产品',
    sqlQuery: 'SELECT * FROM products WHERE price < 100;',
    queryType: 'simple',
    intent: '数值比较',
    fields: ['price', 'products'],
    conditions: ['price < 100'],
    difficulty: 'beginner',
    tags: ['where', 'less_than', 'price'],
    source: 'manual'
  },
  {
    id: 'where_004',
    naturalQuery: '查询部门是"销售部"的员工',
    sqlQuery: "SELECT * FROM employees WHERE department = '销售部';",
    queryType: 'simple',
    intent: '精确匹配',
    fields: ['department', 'employees'],
    conditions: ["department = '销售部'"],
    difficulty: 'beginner',
    tags: ['where', 'equals', 'department'],
    source: 'manual'
  },
  {
    id: 'where_005',
    naturalQuery: '查找状态为"已发货"的订单',
    sqlQuery: "SELECT * FROM orders WHERE status = '已发货';",
    queryType: 'simple',
    intent: '精确匹配',
    fields: ['status', 'orders'],
    conditions: ["status = '已发货'"],
    difficulty: 'beginner',
    tags: ['where', 'status', 'orders'],
    source: 'manual'
  },
  {
    id: 'where_006',
    naturalQuery: '查询库存大于0的产品',
    sqlQuery: 'SELECT * FROM products WHERE stock_quantity > 0;',
    queryType: 'simple',
    intent: '数值比较',
    fields: ['stock_quantity', 'products'],
    conditions: ['stock_quantity > 0'],
    difficulty: 'beginner',
    tags: ['where', 'inventory', 'available'],
    source: 'manual'
  },
  {
    id: 'where_007',
    naturalQuery: '查找工资在5000到10000之间的员工',
    sqlQuery: 'SELECT * FROM employees WHERE salary BETWEEN 5000 AND 10000;',
    queryType: 'simple',
    intent: '范围查询',
    fields: ['salary', 'employees'],
    conditions: ['salary BETWEEN 5000 AND 10000'],
    difficulty: 'intermediate',
    tags: ['where', 'between', 'salary'],
    source: 'manual'
  },
  {
    id: 'where_008',
    naturalQuery: '查询邮箱包含"gmail.com"的客户',
    sqlQuery: "SELECT * FROM customers WHERE email LIKE '%gmail.com';",
    queryType: 'simple',
    intent: '模糊匹配',
    fields: ['email', 'customers'],
    conditions: ["email LIKE '%gmail.com'"],
    difficulty: 'intermediate',
    tags: ['where', 'like', 'email'],
    source: 'manual'
  },
  {
    id: 'where_009',
    naturalQuery: '查找城市是"北京"或"上海"的客户',
    sqlQuery: "SELECT * FROM customers WHERE city IN ('北京', '上海');",
    queryType: 'simple',
    intent: '多值匹配',
    fields: ['city', 'customers'],
    conditions: ["city IN ('北京', '上海')"],
    difficulty: 'intermediate',
    tags: ['where', 'in', 'city'],
    source: 'manual'
  },
  {
    id: 'where_010',
    naturalQuery: '查询没有分配部门的员工',
    sqlQuery: "SELECT * FROM employees WHERE department IS NULL;",
    queryType: 'simple',
    intent: '空值检查',
    fields: ['department', 'employees'],
    conditions: ['department IS NULL'],
    difficulty: 'intermediate',
    tags: ['where', 'null', 'department'],
    source: 'manual'
  }
];

/**
 * ORDER BY示例（5个）
 */
export const orderByExamples: QueryExample[] = [
  {
    id: 'orderby_001',
    naturalQuery: '按年龄从大到小排序显示员工',
    sqlQuery: 'SELECT * FROM employees ORDER BY age DESC;',
    queryType: 'simple',
    intent: '降序排序',
    fields: ['age', 'employees'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['order_by', 'desc', 'age'],
    source: 'manual'
  },
  {
    id: 'orderby_002',
    naturalQuery: '按价格从低到高显示产品',
    sqlQuery: 'SELECT * FROM products ORDER BY price ASC;',
    queryType: 'simple',
    intent: '升序排序',
    fields: ['price', 'products'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['order_by', 'asc', 'price'],
    source: 'manual'
  },
  {
    id: 'orderby_003',
    naturalQuery: '按订单日期从新到旧显示订单',
    sqlQuery: 'SELECT * FROM orders ORDER BY order_date DESC;',
    queryType: 'simple',
    intent: '日期降序',
    fields: ['order_date', 'orders'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['order_by', 'date', 'desc'],
    source: 'manual'
  },
  {
    id: 'orderby_004',
    naturalQuery: '按姓名字母顺序显示员工',
    sqlQuery: 'SELECT * FROM employees ORDER BY name ASC;',
    queryType: 'simple',
    intent: '字符串排序',
    fields: ['name', 'employees'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['order_by', 'name', 'asc'],
    source: 'manual'
  },
  {
    id: 'orderby_005',
    naturalQuery: '先按部门排序，再按工资降序显示员工',
    sqlQuery: 'SELECT * FROM employees ORDER BY department ASC, salary DESC;',
    queryType: 'simple',
    intent: '多字段排序',
    fields: ['department', 'salary', 'employees'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['order_by', 'multiple', 'sort'],
    source: 'manual'
  }
];

/**
 * LIMIT示例（5个）
 */
export const limitExamples: QueryExample[] = [
  {
    id: 'limit_001',
    naturalQuery: '显示前5个产品',
    sqlQuery: 'SELECT * FROM products LIMIT 5;',
    queryType: 'simple',
    intent: '限制数量',
    fields: ['products'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['limit', 'top', 'products'],
    source: 'manual'
  },
  {
    id: 'limit_002',
    naturalQuery: '查询最新的10条订单',
    sqlQuery: 'SELECT * FROM orders ORDER BY order_date DESC LIMIT 10;',
    queryType: 'simple',
    intent: '最新记录',
    fields: ['order_date', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取最新的订单',
      '确定排序：按日期降序 ORDER BY order_date DESC',
      '限制数量：LIMIT 10'
    ],
    difficulty: 'intermediate',
    tags: ['limit', 'order_by', 'latest'],
    source: 'manual'
  },
  {
    id: 'limit_003',
    naturalQuery: '显示工资最高的3名员工',
    sqlQuery: 'SELECT * FROM employees ORDER BY salary DESC LIMIT 3;',
    queryType: 'simple',
    intent: 'Top-N查询',
    fields: ['salary', 'employees'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['limit', 'top', 'salary'],
    source: 'manual'
  },
  {
    id: 'limit_004',
    naturalQuery: '跳过前5条记录，显示接下来的10条记录',
    sqlQuery: 'SELECT * FROM products LIMIT 10 OFFSET 5;',
    queryType: 'simple',
    intent: '分页查询',
    fields: ['products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['limit', 'offset', 'pagination'],
    source: 'manual'
  },
  {
    id: 'limit_005',
    naturalQuery: '显示第2页的产品，每页10条',
    sqlQuery: 'SELECT * FROM products LIMIT 10 OFFSET 10;',
    queryType: 'simple',
    intent: '分页查询',
    fields: ['products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['limit', 'offset', 'page'],
    source: 'manual'
  }
];

// ============================================================================
// 聚合查询示例（25个）
// ============================================================================

/**
 * COUNT/SUM/AVG示例（10个）
 */
export const aggregateExamples: QueryExample[] = [
  {
    id: 'agg_001',
    naturalQuery: '统计员工总数',
    sqlQuery: 'SELECT COUNT(*) as total_employees FROM employees;',
    queryType: 'aggregate',
    intent: '计数',
    fields: ['employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算员工总数',
      '选择函数：COUNT(*) 统计所有行',
      '添加别名：as total_employees'
    ],
    difficulty: 'beginner',
    tags: ['count', 'total', 'employees'],
    source: 'manual'
  },
  {
    id: 'agg_002',
    naturalQuery: '计算所有订单的总金额',
    sqlQuery: 'SELECT SUM(total_amount) as total_sales FROM orders;',
    queryType: 'aggregate',
    intent: '求和',
    fields: ['total_amount', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算订单总金额',
      '选择函数：SUM(total_amount) 求和',
      '添加别名：as total_sales'
    ],
    difficulty: 'beginner',
    tags: ['sum', 'total', 'orders'],
    source: 'manual'
  },
  {
    id: 'agg_003',
    naturalQuery: '计算员工的平均工资',
    sqlQuery: 'SELECT AVG(salary) as average_salary FROM employees;',
    queryType: 'aggregate',
    intent: '平均值',
    fields: ['salary', 'employees'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['avg', 'salary', 'employees'],
    source: 'manual'
  },
  {
    id: 'agg_004',
    naturalQuery: '查找最高工资',
    sqlQuery: 'SELECT MAX(salary) as max_salary FROM employees;',
    queryType: 'aggregate',
    intent: '最大值',
    fields: ['salary', 'employees'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['max', 'salary', 'employees'],
    source: 'manual'
  },
  {
    id: 'agg_005',
    naturalQuery: '查找最低价格的产品',
    sqlQuery: 'SELECT MIN(price) as min_price FROM products;',
    queryType: 'aggregate',
    intent: '最小值',
    fields: ['price', 'products'],
    conditions: [],
    difficulty: 'beginner',
    tags: ['min', 'price', 'products'],
    source: 'manual'
  },
  {
    id: 'agg_006',
    naturalQuery: '统计销售部的员工人数',
    sqlQuery: "SELECT COUNT(*) as sales_count FROM employees WHERE department = '销售部';",
    queryType: 'aggregate',
    intent: '条件计数',
    fields: ['department', 'employees'],
    conditions: ["department = '销售部'"],
    reasoningSteps: [
      '识别需求：统计特定部门的员工数',
      '添加条件：WHERE department = "销售部"',
      '计数：COUNT(*)'
    ],
    difficulty: 'intermediate',
    tags: ['count', 'where', 'department'],
    source: 'manual'
  },
  {
    id: 'agg_007',
    naturalQuery: '计算已发货订单的总金额',
    sqlQuery: "SELECT SUM(total_amount) as shipped_total FROM orders WHERE status = '已发货';",
    queryType: 'aggregate',
    intent: '条件求和',
    fields: ['total_amount', 'status', 'orders'],
    conditions: ["status = '已发货'"],
    difficulty: 'intermediate',
    tags: ['sum', 'where', 'status'],
    source: 'manual'
  },
  {
    id: 'agg_008',
    naturalQuery: '计算每个部门的平均工资',
    sqlQuery: 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department;',
    queryType: 'aggregate',
    intent: '分组聚合',
    fields: ['department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：按部门计算平均工资',
      '选择分组：GROUP BY department',
      '计算平均：AVG(salary)'
    ],
    difficulty: 'intermediate',
    tags: ['avg', 'group_by', 'department'],
    source: 'manual'
  },
  {
    id: 'agg_009',
    naturalQuery: '统计每个产品类别的产品数量',
    sqlQuery: 'SELECT category, COUNT(*) as product_count FROM products GROUP BY category;',
    queryType: 'aggregate',
    intent: '分组计数',
    fields: ['category', 'products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['count', 'group_by', 'category'],
    source: 'manual'
  },
  {
    id: 'agg_010',
    naturalQuery: '计算每个客户的订单总数和总金额',
    sqlQuery: 'SELECT customer_id, COUNT(*) as order_count, SUM(total_amount) as total_spent FROM orders GROUP BY customer_id;',
    queryType: 'aggregate',
    intent: '多聚合函数',
    fields: ['customer_id', 'total_amount', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：统计每个客户的订单情况',
      '选择分组：GROUP BY customer_id',
      '多个聚合：COUNT(*) 和 SUM(total_amount)'
    ],
    difficulty: 'intermediate',
    tags: ['count', 'sum', 'group_by', 'customer'],
    source: 'manual'
  }
];

/**
 * GROUP BY示例（10个）
 */
export const groupByExamples: QueryExample[] = [
  {
    id: 'groupby_001',
    naturalQuery: '统计每个部门的员工数量',
    sqlQuery: 'SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department;',
    queryType: 'aggregate',
    intent: '分组统计',
    fields: ['department', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：按部门统计员工数',
      '分组字段：department',
      '聚合函数：COUNT(*)'
    ],
    difficulty: 'intermediate',
    tags: ['group_by', 'count', 'department'],
    source: 'manual'
  },
  {
    id: 'groupby_002',
    naturalQuery: '计算每个产品类别的平均价格',
    sqlQuery: 'SELECT category, AVG(price) as avg_price FROM products GROUP BY category;',
    queryType: 'aggregate',
    intent: '分组平均',
    fields: ['category', 'price', 'products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'avg', 'category'],
    source: 'manual'
  },
  {
    id: 'groupby_003',
    naturalQuery: '统计每个订单状态的数量',
    sqlQuery: 'SELECT status, COUNT(*) as status_count FROM orders GROUP BY status;',
    queryType: 'aggregate',
    intent: '分组统计',
    fields: ['status', 'orders'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'count', 'status'],
    source: 'manual'
  },
  {
    id: 'groupby_004',
    naturalQuery: '计算每个城市的客户数量',
    sqlQuery: 'SELECT city, COUNT(*) as customer_count FROM customers GROUP BY city;',
    queryType: 'aggregate',
    intent: '分组统计',
    fields: ['city', 'customers'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'count', 'city'],
    source: 'manual'
  },
  {
    id: 'groupby_005',
    naturalQuery: '统计每个员工的订单数量',
    sqlQuery: 'SELECT employee_id, COUNT(*) as order_count FROM orders GROUP BY employee_id;',
    queryType: 'aggregate',
    intent: '分组统计',
    fields: ['employee_id', 'orders'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'count', 'employee'],
    source: 'manual'
  },
  {
    id: 'groupby_006',
    naturalQuery: '计算每年每月的销售总额',
    sqlQuery: 'SELECT YEAR(order_date) as year, MONTH(order_date) as month, SUM(total_amount) as monthly_sales FROM orders GROUP BY YEAR(order_date), MONTH(order_date);',
    queryType: 'aggregate',
    intent: '时间分组',
    fields: ['order_date', 'total_amount', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：按年月统计销售额',
      '提取时间：YEAR(order_date), MONTH(order_date)',
      '分组：GROUP BY YEAR(order_date), MONTH(order_date)',
      '聚合：SUM(total_amount)'
    ],
    difficulty: 'advanced',
    tags: ['group_by', 'date', 'sum'],
    source: 'manual'
  },
  {
    id: 'groupby_007',
    naturalQuery: '统计每个部门每个职位的员工数',
    sqlQuery: 'SELECT department, position, COUNT(*) as employee_count FROM employees GROUP BY department, position;',
    queryType: 'aggregate',
    intent: '多字段分组',
    fields: ['department', 'position', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：按部门和职位统计',
      '多字段分组：GROUP BY department, position',
      '聚合：COUNT(*)'
    ],
    difficulty: 'advanced',
    tags: ['group_by', 'multiple', 'department'],
    source: 'manual'
  },
  {
    id: 'groupby_008',
    naturalQuery: '查找每个类别中最贵的产品',
    sqlQuery: 'SELECT category, MAX(price) as max_price FROM products GROUP BY category;',
    queryType: 'aggregate',
    intent: '分组最大值',
    fields: ['category', 'price', 'products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'max', 'price'],
    source: 'manual'
  },
  {
    id: 'groupby_009',
    naturalQuery: '计算每个客户的平均订单金额',
    sqlQuery: 'SELECT customer_id, AVG(total_amount) as avg_order_value FROM orders GROUP BY customer_id;',
    queryType: 'aggregate',
    intent: '分组平均',
    fields: ['customer_id', 'total_amount', 'orders'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'avg', 'customer'],
    source: 'manual'
  },
  {
    id: 'groupby_010',
    naturalQuery: '统计每个状态下的订单总金额和订单数',
    sqlQuery: 'SELECT status, COUNT(*) as order_count, SUM(total_amount) as total_amount FROM orders GROUP BY status;',
    queryType: 'aggregate',
    intent: '多聚合',
    fields: ['status', 'total_amount', 'orders'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['group_by', 'count', 'sum'],
    source: 'manual'
  }
];

/**
 * HAVING示例（5个）
 */
export const havingExamples: QueryExample[] = [
  {
    id: 'having_001',
    naturalQuery: '查找订单数量超过5的客户',
    sqlQuery: 'SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id HAVING COUNT(*) > 5;',
    queryType: 'aggregate',
    intent: '聚合条件过滤',
    fields: ['customer_id', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出订单多的客户',
      '先分组：GROUP BY customer_id',
      '再过滤：HAVING COUNT(*) > 5'
    ],
    difficulty: 'advanced',
    tags: ['having', 'group_by', 'count'],
    source: 'manual'
  },
  {
    id: 'having_002',
    naturalQuery: '查找平均工资大于8000的部门',
    sqlQuery: 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 8000;',
    queryType: 'aggregate',
    intent: '聚合条件过滤',
    fields: ['department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出高薪部门',
      '先分组计算平均：GROUP BY department, AVG(salary)',
      '再过滤：HAVING AVG(salary) > 8000'
    ],
    difficulty: 'advanced',
    tags: ['having', 'avg', 'salary'],
    source: 'manual'
  },
  {
    id: 'having_003',
    naturalQuery: '查找总销售额超过10000的产品类别',
    sqlQuery: 'SELECT category, SUM(price * stock_quantity) as total_value FROM products GROUP BY category HAVING SUM(price * stock_quantity) > 10000;',
    queryType: 'aggregate',
    intent: '聚合条件过滤',
    fields: ['category', 'price', 'stock_quantity', 'products'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['having', 'sum', 'category'],
    source: 'manual'
  },
  {
    id: 'having_004',
    naturalQuery: '查找员工数大于10的部门',
    sqlQuery: 'SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department HAVING COUNT(*) > 10;',
    queryType: 'aggregate',
    intent: '聚合条件过滤',
    fields: ['department', 'employees'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['having', 'count', 'department'],
    source: 'manual'
  },
  {
    id: 'having_005',
    naturalQuery: '查找平均订单金额大于500的客户',
    sqlQuery: 'SELECT customer_id, AVG(total_amount) as avg_amount FROM orders GROUP BY customer_id HAVING AVG(total_amount) > 500;',
    queryType: 'aggregate',
    intent: '聚合条件过滤',
    fields: ['customer_id', 'total_amount', 'orders'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['having', 'avg', 'customer'],
    source: 'manual'
  }
];

// ============================================================================
// JOIN查询示例（25个）
// ============================================================================

/**
 * 内连接示例（10个）
 */
export const innerJoinExamples: QueryExample[] = [
  {
    id: 'join_inner_001',
    naturalQuery: '查询员工及其所属部门的名称',
    sqlQuery: 'SELECT employees.name, departments.department_name FROM employees INNER JOIN departments ON employees.department_id = departments.department_id;',
    queryType: 'join',
    intent: '表连接',
    fields: ['name', 'department_name', 'employees', 'departments'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取员工和部门信息',
      '确定表：employees（主表）, departments（关联表）',
      '连接条件：ON employees.department_id = departments.department_id',
      '连接类型：INNER JOIN（只返回匹配的记录）'
    ],
    difficulty: 'intermediate',
    tags: ['inner_join', 'department', 'employee'],
    source: 'manual'
  },
  {
    id: 'join_inner_002',
    naturalQuery: '查询订单及其对应的客户信息',
    sqlQuery: 'SELECT orders.order_id, orders.order_date, customers.customer_name FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id;',
    queryType: 'join',
    intent: '表连接',
    fields: ['order_id', 'order_date', 'customer_name', 'orders', 'customers'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['inner_join', 'customer', 'order'],
    source: 'manual'
  },
  {
    id: 'join_inner_003',
    naturalQuery: '查询订单详情和产品信息',
    sqlQuery: 'SELECT order_items.order_id, products.product_name, order_items.quantity, order_items.price FROM order_items INNER JOIN products ON order_items.product_id = products.product_id;',
    queryType: 'join',
    intent: '表连接',
    fields: ['order_items', 'products'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['inner_join', 'product', 'order_item'],
    source: 'manual'
  },
  {
    id: 'join_inner_004',
    naturalQuery: '查询员工姓名和他们的经理姓名',
    sqlQuery: "SELECT e.name as employee_name, m.name as manager_name FROM employees e INNER JOIN employees m ON e.manager_id = m.employee_id;",
    queryType: 'join',
    intent: '自连接',
    fields: ['name', 'manager_id', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取员工和经理信息',
      '特点：员工和经理都在同一张表',
      '自连接：FROM employees e INNER JOIN employees m',
      '连接条件：ON e.manager_id = m.employee_id'
    ],
    difficulty: 'advanced',
    tags: ['inner_join', 'self_join', 'manager'],
    source: 'manual'
  },
  {
    id: 'join_inner_005',
    naturalQuery: '查询客户及其所在地区的名称',
    sqlQuery: 'SELECT customers.customer_name, regions.region_name FROM customers INNER JOIN regions ON customers.region_id = regions.region_id;',
    queryType: 'join',
    intent: '表连接',
    fields: ['customer_name', 'region_name', 'customers', 'regions'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['inner_join', 'region', 'customer'],
    source: 'manual'
  },
  {
    id: 'join_inner_006',
    naturalQuery: '查询产品及其所属类别',
    sqlQuery: 'SELECT products.product_name, categories.category_name FROM products INNER JOIN categories ON products.category_id = categories.category_id;',
    queryType: 'join',
    intent: '表连接',
    fields: ['product_name', 'category_name', 'products', 'categories'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['inner_join', 'category', 'product'],
    source: 'manual'
  },
  {
    id: 'join_inner_007',
    naturalQuery: '查询订单金额大于1000的订单及其客户信息',
    sqlQuery: "SELECT orders.order_id, customers.customer_name, orders.total_amount FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id WHERE orders.total_amount > 1000;",
    queryType: 'join',
    intent: '带条件的连接',
    fields: ['order_id', 'customer_name', 'total_amount', 'orders', 'customers'],
    conditions: ['total_amount > 1000'],
    reasoningSteps: [
      '识别需求：获取大额订单和客户信息',
      '先连接：INNER JOIN customers ON ...',
      '再过滤：WHERE total_amount > 1000'
    ],
    difficulty: 'intermediate',
    tags: ['inner_join', 'where', 'amount'],
    source: 'manual'
  },
  {
    id: 'join_inner_008',
    naturalQuery: '查询员工及其处理的订单数量',
    sqlQuery: 'SELECT employees.name, COUNT(orders.order_id) as order_count FROM employees INNER JOIN orders ON employees.employee_id = orders.employee_id GROUP BY employees.employee_id, employees.name;',
    queryType: 'join',
    intent: '连接+聚合',
    fields: ['name', 'orders', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：统计每个员工的订单数',
      '连接表：INNER JOIN orders',
      '分组统计：GROUP BY employees.employee_id',
      '计数：COUNT(orders.order_id)'
    ],
    difficulty: 'advanced',
    tags: ['inner_join', 'count', 'group_by'],
    source: 'manual'
  },
  {
    id: 'join_inner_009',
    naturalQuery: '查询销售部门的员工姓名',
    sqlQuery: "SELECT employees.name FROM employees INNER JOIN departments ON employees.department_id = departments.department_id WHERE departments.department_name = '销售部';",
    queryType: 'join',
    intent: '连接+过滤',
    fields: ['name', 'employees', 'departments'],
    conditions: ["department_name = '销售部'"],
    difficulty: 'intermediate',
    tags: ['inner_join', 'where', 'department'],
    source: 'manual'
  },
  {
    id: 'join_inner_010',
    naturalQuery: '查询购买了产品的客户和产品名称',
    sqlQuery: 'SELECT customers.customer_name, products.product_name FROM customers INNER JOIN orders ON customers.customer_id = orders.customer_id INNER JOIN order_items ON orders.order_id = order_items.order_id INNER JOIN products ON order_items.product_id = products.product_id;',
    queryType: 'join',
    intent: '多表连接',
    fields: ['customer_name', 'product_name', 'customers', 'orders', 'order_items', 'products'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取客户和购买的产品',
      '多表连接：customers -> orders -> order_items -> products',
      '每个连接都有对应的ON条件'
    ],
    difficulty: 'advanced',
    tags: ['inner_join', 'multiple_tables', 'product'],
    source: 'manual'
  }
];

/**
 * 左连接示例（8个）
 */
export const leftJoinExamples: QueryExample[] = [
  {
    id: 'join_left_001',
    naturalQuery: '查询所有员工及其部门信息（包括没有部门的员工）',
    sqlQuery: 'SELECT employees.name, departments.department_name FROM employees LEFT JOIN departments ON employees.department_id = departments.department_id;',
    queryType: 'join',
    intent: '左连接',
    fields: ['name', 'department_name', 'employees', 'departments'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取所有员工，即使没有部门',
      '选择LEFT JOIN：保留左表（employees）的所有记录',
      '结果：没有部门的员工，department_name为NULL'
    ],
    difficulty: 'intermediate',
    tags: ['left_join', 'department', 'employee'],
    source: 'manual'
  },
  {
    id: 'join_left_002',
    naturalQuery: '查询所有客户及其订单（包括没有订单的客户）',
    sqlQuery: 'SELECT customers.customer_name, orders.order_id, orders.order_date FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id;',
    queryType: 'join',
    intent: '左连接',
    fields: ['customer_name', 'order_id', 'order_date', 'customers', 'orders'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['left_join', 'customer', 'order'],
    source: 'manual'
  },
  {
    id: 'join_left_003',
    naturalQuery: '查询所有产品及其销售记录（包括未售出的产品）',
    sqlQuery: 'SELECT products.product_name, order_items.quantity FROM products LEFT JOIN order_items ON products.product_id = order_items.product_id;',
    queryType: 'join',
    intent: '左连接',
    fields: ['product_name', 'quantity', 'products', 'order_items'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['left_join', 'product', 'sales'],
    source: 'manual'
  },
  {
    id: 'join_left_004',
    naturalQuery: '查找没有订单的客户',
    sqlQuery: "SELECT customers.customer_name FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id WHERE orders.order_id IS NULL;",
    queryType: 'join',
    intent: '左连接+空值检查',
    fields: ['customer_name', 'customers', 'orders'],
    conditions: ['order_id IS NULL'],
    reasoningSteps: [
      '识别需求：找出从未下单的客户',
      '使用LEFT JOIN：保留所有客户',
      '过滤条件：WHERE orders.order_id IS NULL（未匹配到订单）'
    ],
    difficulty: 'advanced',
    tags: ['left_join', 'null', 'filter'],
    source: 'manual'
  },
  {
    id: 'join_left_005',
    naturalQuery: '查询员工及其经理（包括没有经理的员工）',
    sqlQuery: "SELECT e.name as employee_name, m.name as manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.employee_id;",
    queryType: 'join',
    intent: '自连接-左连接',
    fields: ['name', 'manager_id', 'employees'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['left_join', 'self_join', 'manager'],
    source: 'manual'
  },
  {
    id: 'join_left_006',
    naturalQuery: '查询所有类别及其产品数量（包括没有产品的类别）',
    sqlQuery: 'SELECT categories.category_name, COUNT(products.product_id) as product_count FROM categories LEFT JOIN products ON categories.category_id = products.category_id GROUP BY categories.category_id, categories.category_name;',
    queryType: 'join',
    intent: '左连接+聚合',
    fields: ['category_name', 'products', 'categories'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['left_join', 'count', 'group_by'],
    source: 'manual'
  },
  {
    id: 'join_left_007',
    naturalQuery: '查询所有部门及其员工数（包括没有员工的部门）',
    sqlQuery: 'SELECT departments.department_name, COUNT(employees.employee_id) as employee_count FROM departments LEFT JOIN employees ON departments.department_id = employees.department_id GROUP BY departments.department_id, departments.department_name;',
    queryType: 'join',
    intent: '左连接+聚合',
    fields: ['department_name', 'employees', 'departments'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['left_join', 'count', 'group_by'],
    source: 'manual'
  },
  {
    id: 'join_left_008',
    naturalQuery: '查询所有订单及其支付状态（包括未支付的订单）',
    sqlQuery: 'SELECT orders.order_id, payments.payment_status FROM orders LEFT JOIN payments ON orders.order_id = payments.order_id;',
    queryType: 'join',
    intent: '左连接',
    fields: ['order_id', 'payment_status', 'orders', 'payments'],
    conditions: [],
    difficulty: 'intermediate',
    tags: ['left_join', 'payment', 'order'],
    source: 'manual'
  }
];

/**
 * 多表连接示例（7个）
 */
export const multiTableJoinExamples: QueryExample[] = [
  {
    id: 'join_multi_001',
    naturalQuery: '查询订单、客户和产品的完整信息',
    sqlQuery: 'SELECT orders.order_id, customers.customer_name, products.product_name, order_items.quantity FROM ((orders INNER JOIN customers ON orders.customer_id = customers.customer_id) INNER JOIN order_items ON orders.order_id = order_items.order_id) INNER JOIN products ON order_items.product_id = products.product_id;',
    queryType: 'join',
    intent: '多表连接',
    fields: ['orders', 'customers', 'products', 'order_items'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取订单的完整信息',
      '确定涉及的表：orders, customers, order_items, products',
      '规划连接顺序：orders -> customers -> order_items -> products',
      '每个连接都有对应的ON条件'
    ],
    difficulty: 'advanced',
    tags: ['multi_join', 'orders', 'products'],
    source: 'manual'
  },
  {
    id: 'join_multi_002',
    naturalQuery: '查询员工、部门、地区的信息',
    sqlQuery: 'SELECT employees.name, departments.department_name, regions.region_name FROM ((employees INNER JOIN departments ON employees.department_id = departments.department_id) INNER JOIN regions ON departments.region_id = regions.region_id);',
    queryType: 'join',
    intent: '多表连接',
    fields: ['name', 'department_name', 'region_name', 'employees', 'departments', 'regions'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['multi_join', 'employee', 'department'],
    source: 'manual'
  },
  {
    id: 'join_multi_003',
    naturalQuery: '查询每个订单的总金额和客户名称',
    sqlQuery: 'SELECT orders.order_id, customers.customer_name, SUM(order_items.price * order_items.quantity) as order_total FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id INNER JOIN order_items ON orders.order_id = order_items.order_id GROUP BY orders.order_id, customers.customer_name;',
    queryType: 'join',
    intent: '多表连接+聚合',
    fields: ['orders', 'customers', 'order_items'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算每个订单的总金额',
      '连接表：orders, customers, order_items',
      '聚合计算：SUM(price * quantity)',
      '分组：GROUP BY order_id, customer_name'
    ],
    difficulty: 'advanced',
    tags: ['multi_join', 'sum', 'group_by'],
    source: 'manual'
  },
  {
    id: 'join_multi_004',
    naturalQuery: '查询员工的姓名、部门名称和经理姓名',
    sqlQuery: "SELECT e.name as employee_name, d.department_name, m.name as manager_name FROM employees e INNER JOIN departments d ON e.department_id = d.department_id LEFT JOIN employees m ON e.manager_id = m.employee_id;",
    queryType: 'join',
    intent: '多表连接',
    fields: ['name', 'department_name', 'employees', 'departments'],
    conditions: [],
    reasoningSteps: [
      '识别需求：获取员工、部门和经理信息',
      '连接1：INNER JOIN departments（员工必属于部门）',
      '连接2：LEFT JOIN employees（经理可能为空）'
    ],
    difficulty: 'advanced',
    tags: ['multi_join', 'manager', 'department'],
    source: 'manual'
  },
  {
    id: 'join_multi_005',
    naturalQuery: '查询购买了特定类别产品的客户',
    sqlQuery: "SELECT DISTINCT customers.customer_name FROM customers INNER JOIN orders ON customers.customer_id = orders.customer_id INNER JOIN order_items ON orders.order_id = order_items.order_id INNER JOIN products ON order_items.product_id = products.product_id WHERE products.category = '电子产品';",
    queryType: 'join',
    intent: '多表连接+过滤',
    fields: ['customer_name', 'customers', 'orders', 'order_items', 'products'],
    conditions: ["category = '电子产品'"],
    difficulty: 'advanced',
    tags: ['multi_join', 'where', 'category'],
    source: 'manual'
  },
  {
    id: 'join_multi_006',
    naturalQuery: '查询每个部门的员工数、平均工资和部门名称',
    sqlQuery: 'SELECT departments.department_name, COUNT(employees.employee_id) as employee_count, AVG(employees.salary) as avg_salary FROM departments LEFT JOIN employees ON departments.department_id = employees.department_id GROUP BY departments.department_id, departments.department_name;',
    queryType: 'join',
    intent: '多表连接+聚合',
    fields: ['department_name', 'employees', 'departments'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['multi_join', 'count', 'avg'],
    source: 'manual'
  },
  {
    id: 'join_multi_007',
    naturalQuery: '查询订单日期、客户名称、产品名称和数量',
    sqlQuery: 'SELECT orders.order_date, customers.customer_name, products.product_name, order_items.quantity FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id INNER JOIN order_items ON orders.order_id = order_items.order_id INNER JOIN products ON order_items.product_id = products.product_id ORDER BY orders.order_date DESC;',
    queryType: 'join',
    intent: '多表连接+排序',
    fields: ['order_date', 'customer_name', 'product_name', 'orders', 'customers', 'products', 'order_items'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['multi_join', 'order_by', 'date'],
    source: 'manual'
  }
];

// ============================================================================
// 复杂查询示例（20个）
// ============================================================================

/**
 * 子查询示例（8个）
 */
export const subqueryExamples: QueryExample[] = [
  {
    id: 'subquery_001',
    naturalQuery: '查询工资高于平均工资的员工',
    sqlQuery: 'SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);',
    queryType: 'complex',
    intent: '子查询-比较',
    fields: ['salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出高薪员工',
      '先计算平均工资：SELECT AVG(salary) FROM employees',
      '再比较：WHERE salary > (子查询结果)'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'avg', 'comparison'],
    source: 'manual'
  },
  {
    id: 'subquery_002',
    naturalQuery: '查询与"张三"在同一部门的员工',
    sqlQuery: "SELECT * FROM employees WHERE department = (SELECT department FROM employees WHERE name = '张三') AND name != '张三';",
    queryType: 'complex',
    intent: '子查询-匹配',
    fields: ['department', 'name', 'employees'],
    conditions: ["name != '张三'"],
    reasoningSteps: [
      '识别需求：找出同部门的其他员工',
      '先找到张三的部门：SELECT department FROM employees WHERE name = "张三"',
      '再查找同部门员工：WHERE department = (子查询)',
      '排除张三自己：AND name != "张三"'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'department', 'filter'],
    source: 'manual'
  },
  {
    id: 'subquery_003',
    naturalQuery: '查询购买过产品ID为1的所有客户',
    sqlQuery: 'SELECT * FROM customers WHERE customer_id IN (SELECT customer_id FROM orders WHERE order_id IN (SELECT order_id FROM order_items WHERE product_id = 1));',
    queryType: 'complex',
    intent: '嵌套子查询',
    fields: ['customer_id', 'customers', 'orders', 'order_items'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找到购买特定产品的客户',
      '最内层：找到包含该产品的订单项',
      '中间层：找到对应的订单',
      '最外层：找到下单的客户',
      '使用IN连接多层子查询'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'nested', 'in'],
    source: 'manual'
  },
  {
    id: 'subquery_004',
    naturalQuery: '查询销售额最高的产品类别',
    sqlQuery: 'SELECT category_name FROM categories WHERE category_id = (SELECT category_id FROM products GROUP BY category_id ORDER BY SUM(price * stock_quantity) DESC LIMIT 1);',
    queryType: 'complex',
    intent: '子查询-排序',
    fields: ['category_name', 'categories', 'products'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找到最畅销的类别',
      '先计算每个类别的销售额：GROUP BY category_id',
      '排序并取第一：ORDER BY ... DESC LIMIT 1',
      '再查询类别名称：WHERE category_id = (子查询)'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'order_by', 'top'],
    source: 'manual'
  },
  {
    id: 'subquery_005',
    naturalQuery: '查询每个部门工资最高的员工',
    sqlQuery: 'SELECT * FROM employees e1 WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department = e1.department);',
    queryType: 'complex',
    intent: '相关子查询',
    fields: ['salary', 'department', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出各部门的最高薪员工',
      '相关子查询：对于每个员工e1，找出其部门的最高工资',
      '比较：WHERE e1.salary = (子查询结果)',
      '特点：子查询引用外层查询的表'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'correlated', 'max'],
    source: 'manual'
  },
  {
    id: 'subquery_006',
    naturalQuery: '查询没有下订单的客户',
    sqlQuery: 'SELECT * FROM customers WHERE NOT EXISTS (SELECT * FROM orders WHERE orders.customer_id = customers.customer_id);',
    queryType: 'complex',
    intent: 'NOT EXISTS子查询',
    fields: ['customers', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出从未下单的客户',
      '使用NOT EXISTS：检查是否不存在订单',
      '子查询：SELECT * FROM orders WHERE customer_id匹配',
      '优势：效率比IN某些情况更高'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'not_exists', 'filter'],
    source: 'manual'
  },
  {
    id: 'subquery_007',
    naturalQuery: '查询订单金额大于部门平均工资的订单',
    sqlQuery: 'SELECT * FROM orders WHERE total_amount > (SELECT AVG(salary) FROM employees);',
    queryType: 'complex',
    intent: '跨表子查询',
    fields: ['total_amount', 'orders', 'employees'],
    conditions: [],
    difficulty: 'advanced',
    tags: ['subquery', 'cross_table', 'comparison'],
    source: 'manual'
  },
  {
    id: 'subquery_008',
    naturalQuery: '查询至少下过3次订单的客户',
    sqlQuery: 'SELECT * FROM customers WHERE (SELECT COUNT(*) FROM orders WHERE orders.customer_id = customers.customer_id) >= 3;',
    queryType: 'complex',
    intent: '子查询-聚合条件',
    fields: ['customers', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出活跃客户',
      '子查询：计算每个客户的订单数 COUNT(*)',
      '条件：订单数 >= 3'
    ],
    difficulty: 'advanced',
    tags: ['subquery', 'count', 'filter'],
    source: 'manual'
  }
];

/**
 * 窗口函数示例（7个）
 */
export const windowFunctionExamples: QueryExample[] = [
  {
    id: 'window_001',
    naturalQuery: '查询每个部门的员工及其工资排名',
    sqlQuery: 'SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank FROM employees;',
    queryType: 'complex',
    intent: '窗口函数-排名',
    fields: ['name', 'department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算部门内的工资排名',
      '窗口函数：RANK() - 排名函数',
      '分区：PARTITION BY department - 按部门分组',
      '排序：ORDER BY salary DESC - 工资降序'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'rank', 'partition'],
    source: 'manual'
  },
  {
    id: 'window_002',
    naturalQuery: '查询每个员工的工资及其部门平均工资',
    sqlQuery: 'SELECT name, department, salary, AVG(salary) OVER (PARTITION BY department) as dept_avg_salary FROM employees;',
    queryType: 'complex',
    intent: '窗口函数-聚合',
    fields: ['name', 'department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：显示员工工资和部门平均工资',
      '窗口函数：AVG(salary) OVER (...)',
      '分区：PARTITION BY department - 按部门计算',
      '特点：不使用GROUP BY，保留所有行'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'avg', 'partition'],
    source: 'manual'
  },
  {
    id: 'window_003',
    naturalQuery: '计算每个员工的累计销售额',
    sqlQuery: 'SELECT employee_id, sale_date, amount, SUM(amount) OVER (PARTITION BY employee_id ORDER BY sale_date) as cumulative_sales FROM sales;',
    queryType: 'complex',
    intent: '窗口函数-累计',
    fields: ['employee_id', 'sale_date', 'amount', 'sales'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算每个销售员的累计业绩',
      '窗口函数：SUM(amount) OVER (...)',
      '分区：PARTITION BY employee_id - 按员工分组',
      '排序：ORDER BY sale_date - 按日期累计'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'sum', 'cumulative'],
    source: 'manual'
  },
  {
    id: 'window_004',
    naturalQuery: '查询每行记录的行号',
    sqlQuery: 'SELECT name, department, salary, ROW_NUMBER() OVER (ORDER BY salary DESC) as row_num FROM employees;',
    queryType: 'complex',
    intent: '窗口函数-行号',
    fields: ['name', 'department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：给记录编号',
      '窗口函数：ROW_NUMBER() - 生成唯一行号',
      '排序：ORDER BY salary DESC - 按工资降序编号'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'row_number', 'order'],
    source: 'manual'
  },
  {
    id: 'window_005',
    naturalQuery: '查询每个产品类别的销售额及其在总销售额中的占比',
    sqlQuery: 'SELECT category, SUM(price * stock_quantity) as category_sales, SUM(price * stock_quantity) OVER () as total_sales, SUM(price * stock_quantity) / SUM(price * stock_quantity) OVER () as sales_ratio FROM products GROUP BY category;',
    queryType: 'complex',
    intent: '窗口函数-占比',
    fields: ['category', 'price', 'stock_quantity', 'products'],
    conditions: [],
    reasoningSteps: [
      '识别需求：计算各类别销售额占比',
      '聚合：GROUP BY category, SUM(...)',
      '窗口函数：SUM(...) OVER () - 总销售额（无分区）',
      '计算占比：category_sales / total_sales'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'ratio', 'total'],
    source: 'manual'
  },
  {
    id: 'window_006',
    naturalQuery: '查询每个员工前一笔和后一笔的销售记录',
    sqlQuery: 'SELECT employee_id, sale_date, amount, LAG(amount) OVER (PARTITION BY employee_id ORDER BY sale_date) as prev_amount, LEAD(amount) OVER (PARTITION BY employee_id ORDER BY sale_date) as next_amount FROM sales;',
    queryType: 'complex',
    intent: '窗口函数-偏移',
    fields: ['employee_id', 'sale_date', 'amount', 'sales'],
    conditions: [],
    reasoningSteps: [
      '识别需求：访问相邻行的数据',
      'LAG：取前一行的值',
      'LEAD：取后一行的值',
      '分区和排序：PARTITION BY employee_id ORDER BY sale_date'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'lag', 'lead'],
    source: 'manual'
  },
  {
    id: 'window_007',
    naturalQuery: '查询每个部门工资前三名的员工',
    sqlQuery: 'SELECT * FROM (SELECT name, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank FROM employees) ranked WHERE rank <= 3;',
    queryType: 'complex',
    intent: '窗口函数-Top-N',
    fields: ['name', 'department', 'salary', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出各部门Top 3员工',
      '内层查询：使用DENSE_RANK()计算排名',
      '外层查询：WHERE rank <= 3过滤',
      '使用DENSE_RANK而非RANK：处理并列情况'
    ],
    difficulty: 'advanced',
    tags: ['window_function', 'dense_rank', 'top_n'],
    source: 'manual'
  }
];

/**
 * 组合查询示例（5个）
 */
export const combinedQueryExamples: QueryExample[] = [
  {
    id: 'combined_001',
    naturalQuery: '查询所有客户和员工的姓名（合并结果）',
    sqlQuery: "SELECT customer_name as name, 'customer' as type FROM customers UNION ALL SELECT name, 'employee' as type FROM employees;",
    queryType: 'complex',
    intent: 'UNION合并',
    fields: ['customer_name', 'name', 'customers', 'employees'],
    conditions: [],
    reasoningSteps: [
      '识别需求：合并客户和员工的姓名',
      '使用UNION ALL：合并两个查询结果（保留重复）',
      '添加类型列：区分来源',
      '确保列数和类型匹配'
    ],
    difficulty: 'intermediate',
    tags: ['union', 'combine', 'merge'],
    source: 'manual'
  },
  {
    id: 'combined_002',
    naturalQuery: '查询工资大于5000的员工和销售额大于10000的订单（去重）',
    sqlQuery: 'SELECT name, salary as amount, "employee" as type FROM employees WHERE salary > 5000 UNION SELECT order_id, total_amount, "order" as type FROM orders WHERE total_amount > 10000;',
    queryType: 'complex',
    intent: 'UNION去重',
    fields: ['name', 'salary', 'employees', 'orders'],
    conditions: ['salary > 5000', 'total_amount > 10000'],
    reasoningSteps: [
      '识别需求：合并高薪员工和大额订单',
      '使用UNION（非ALL）：自动去重',
      '确保列数和数据类型匹配',
      '添加类型列区分来源'
    ],
    difficulty: 'intermediate',
    tags: ['union', 'filter', 'combine'],
    source: 'manual'
  },
  {
    id: 'combined_003',
    naturalQuery: '查询北京的客户和北京的员工',
    sqlQuery: "SELECT customer_name as name, 'customer' as type FROM customers WHERE city = '北京' UNION ALL SELECT name, 'employee' as type FROM employees WHERE city = '北京';",
    queryType: 'complex',
    intent: 'UNION条件合并',
    fields: ['customer_name', 'name', 'city', 'customers', 'employees'],
    conditions: ["city = '北京'"],
    difficulty: 'intermediate',
    tags: ['union', 'where', 'city'],
    source: 'manual'
  },
  {
    id: 'combined_004',
    naturalQuery: '查询产品价格大于平均值的产品，和库存为0的产品',
    sqlQuery: "SELECT product_name, 'high_price' as reason FROM products WHERE price > (SELECT AVG(price) FROM products) UNION ALL SELECT product_name, 'out_of_stock' as reason FROM products WHERE stock_quantity = 0;",
    queryType: 'complex',
    intent: 'UNION多条件',
    fields: ['product_name', 'price', 'stock_quantity', 'products'],
    conditions: [],
    reasoningSteps: [
      '识别需求：找出高价格和缺货产品',
      '第一个查询：price > 平均值',
      '第二个查询：stock_quantity = 0',
      '使用UNION ALL合并，添加原因列'
    ],
    difficulty: 'advanced',
    tags: ['union', 'subquery', 'filter'],
    source: 'manual'
  },
  {
    id: 'combined_005',
    naturalQuery: '查询每个客户的订单数，包括没有订单的客户',
    sqlQuery: "SELECT customers.customer_name, COUNT(orders.order_id) as order_count FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id GROUP BY customers.customer_id, customers.customer_name UNION ALL SELECT 'Total', COUNT(*) FROM orders;",
    queryType: 'complex',
    intent: 'UNION总计',
    fields: ['customer_name', 'customers', 'orders'],
    conditions: [],
    reasoningSteps: [
      '识别需求：统计每个客户订单数，并添加总计行',
      '第一个查询：LEFT JOIN统计每个客户',
      '第二个查询：计算总订单数',
      '使用UNION ALL添加总计行'
    ],
    difficulty: 'advanced',
    tags: ['union', 'group_by', 'total'],
    source: 'manual'
  }
];

// ============================================================================
// 导出所有示例
// ============================================================================

/**
 * 所有查询示例
 */
export const allQueryExamples: QueryExample[] = [
  // 基础查询（30个）
  ...simpleSelectExamples,
  ...whereConditionExamples,
  ...orderByExamples,
  ...limitExamples,

  // 聚合查询（25个）
  ...aggregateExamples,
  ...groupByExamples,
  ...havingExamples,

  // JOIN查询（25个）
  ...innerJoinExamples,
  ...leftJoinExamples,
  ...multiTableJoinExamples,

  // 复杂查询（20个）
  ...subqueryExamples,
  ...windowFunctionExamples,
  ...combinedQueryExamples
];

/**
 * 按类型分组的示例
 */
export const queryExamplesByType: Record<QueryType, QueryExample[]> = {
  simple: [
    ...simpleSelectExamples,
    ...whereConditionExamples,
    ...orderByExamples,
    ...limitExamples
  ],
  aggregate: [...aggregateExamples, ...groupByExamples, ...havingExamples],
  join: [...innerJoinExamples, ...leftJoinExamples, ...multiTableJoinExamples],
  complex: [...subqueryExamples, ...windowFunctionExamples, ...combinedQueryExamples]
};

/**
 * 按难度分组的示例
 */
export const queryExamplesByDifficulty: Record<DifficultyLevel, QueryExample[]> = {
  beginner: [
    ...simpleSelectExamples,
    ...whereConditionExamples.slice(0, 5),
    ...orderByExamples,
    ...limitExamples,
    ...aggregateExamples.slice(0, 5)
  ],
  intermediate: [
    ...whereConditionExamples.slice(5),
    ...aggregateExamples.slice(5),
    ...groupByExamples,
    ...innerJoinExamples,
    ...leftJoinExamples
  ],
  advanced: [
    ...havingExamples,
    ...multiTableJoinExamples,
    ...subqueryExamples,
    ...windowFunctionExamples,
    ...combinedQueryExamples
  ]
};

/**
 * 按标签分组的示例
 */
export const queryExamplesByTag: Record<string, QueryExample[]> = {};

// 构建标签索引
allQueryExamples.forEach(example => {
  example.tags.forEach(tag => {
    if (!queryExamplesByTag[tag]) {
      queryExamplesByTag[tag] = [];
    }
    queryExamplesByTag[tag].push(example);
  });
});

/**
 * 获取示例数量统计
 */
export function getExampleStats(): {
  total: number;
  byType: Record<QueryType, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  bySource: Record<ExampleSource, number>;
} {
  return {
    total: allQueryExamples.length,
    byType: {
      simple: queryExamplesByType.simple.length,
      aggregate: queryExamplesByType.aggregate.length,
      join: queryExamplesByType.join.length,
      complex: queryExamplesByType.complex.length
    },
    byDifficulty: {
      beginner: queryExamplesByDifficulty.beginner.length,
      intermediate: queryExamplesByDifficulty.intermediate.length,
      advanced: queryExamplesByDifficulty.advanced.length
    },
    bySource: {
      manual: allQueryExamples.filter(e => e.source === 'manual').length,
      generated: allQueryExamples.filter(e => e.source === 'generated').length,
      user: allQueryExamples.filter(e => e.source === 'user').length
    }
  };
}

/**
 * 搜索示例
 */
export function searchExamples(keyword: string): QueryExample[] {
  const lowerKeyword = keyword.toLowerCase();
  return allQueryExamples.filter(
    example =>
      example.naturalQuery.toLowerCase().includes(lowerKeyword) ||
      example.sqlQuery.toLowerCase().includes(lowerKeyword) ||
      example.intent.toLowerCase().includes(lowerKeyword) ||
      example.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * 根据字段查找示例
 */
export function findExamplesByFields(fields: string[]): QueryExample[] {
  return allQueryExamples.filter(example =>
    fields.some(field => example.fields.includes(field))
  );
}

/**
 * 获取推荐示例（用于学习）
 */
export function getRecommendedExamples(
  queryType?: QueryType,
  difficulty?: DifficultyLevel,
  count: number = 5
): QueryExample[] {
  let candidates = allQueryExamples;

  if (queryType) {
    candidates = candidates.filter(e => e.queryType === queryType);
  }

  if (difficulty) {
    candidates = candidates.filter(e => e.difficulty === difficulty);
  }

  // 随机选择
  return candidates.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * 导出示例为JSON
 */
export function exportExamplesToJSON(): string {
  return JSON.stringify(allQueryExamples, null, 2);
}

/**
 * 从JSON导入示例
 */
export function importExamplesFromJSON(jsonString: string): QueryExample[] {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data as QueryExample[];
    }
    throw new Error('Invalid JSON format');
  } catch (error) {
    console.error('Failed to import examples:', error);
    return [];
  }
}

/**
 * 验证示例质量
 */
export function validateExamples(): {
  valid: number;
  invalid: number;
  errors: Array<{ id: string; errors: string[] }>;
} {
  let valid = 0;
  let invalid = 0;
  const errors: Array<{ id: string; errors: string[] }> = [];

  allQueryExamples.forEach(example => {
    const exampleErrors: string[] = [];

    if (!example.id) exampleErrors.push('Missing id');
    if (!example.naturalQuery) exampleErrors.push('Missing naturalQuery');
    if (!example.sqlQuery) exampleErrors.push('Missing sqlQuery');
    if (!example.queryType) exampleErrors.push('Missing queryType');
    if (!example.intent) exampleErrors.push('Missing intent');
    if (!example.fields || example.fields.length === 0) exampleErrors.push('Missing fields');
    if (!example.difficulty) exampleErrors.push('Missing difficulty');
    if (!example.tags || example.tags.length === 0) exampleErrors.push('Missing tags');
    if (!example.source) exampleErrors.push('Missing source');

    if (exampleErrors.length > 0) {
      invalid++;
      errors.push({ id: example.id, errors: exampleErrors });
    } else {
      valid++;
    }
  });

  return { valid, invalid, errors };
}
