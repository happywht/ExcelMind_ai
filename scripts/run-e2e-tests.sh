#!/bin/bash

# 多Sheet支持功能 - 端到端测试运行脚本

set -e

echo "=========================================="
echo "  多Sheet支持功能 - 端到端测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 检查开发服务器是否运行
echo "1️⃣  检查开发服务器状态..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓${NC} 开发服务器正在运行 (http://localhost:3000)"
else
    echo -e "${YELLOW}⚠${NC} 开发服务器未运行"
    echo "请先运行: pnpm dev"
    echo "或使用: pnpm test:e2e:with-server"
    exit 1
fi

echo ""

# 安装Playwright浏览器（如果需要）
echo "2️⃣  检查Playwright浏览器..."
if ! npx playwright --version > /dev/null 2>&1; then
    echo "安装Playwright浏览器..."
    npx playwright install chromium
else
    echo -e "${GREEN}✓${NC} Playwright已安装"
fi

echo ""

# 生成测试文件
echo "3️⃣  生成测试Excel文件..."
node scripts/generate-test-files.js

echo ""

# 运行测试
echo "4️⃣  运行端到端测试..."
echo ""

# 创建测试结果目录
mkdir -p tests/test-results

# 运行Playwright测试
npx playwright test "$@"

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "📊 测试报告:"
echo "  - HTML报告: tests/test-results/html/index.html"
echo "  - JSON报告: tests/test-results/results.json"
echo "  - 截图: tests/screenshots/"
echo ""
echo "查看HTML报告:"
echo "  npx playwright show-report tests/test-results/html"
echo ""
