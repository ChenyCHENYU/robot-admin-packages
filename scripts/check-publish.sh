#!/bin/bash
# 发布到 npm 组织的辅助脚本

echo "=== 检查 npm 登录状态 ==="
npm whoami

echo -e "\n=== 检查组织权限 ==="
npm org ls robot-admin 2>/dev/null || echo "提示: 如果看到错误，请确保你是 robot-admin 组织成员"

echo -e "\n=== 确认包配置 ==="
cat packages/request-core/package.json | grep -A 5 "publishConfig"

echo -e "\n=== 下一步: 使用 Changesets 发布 ==="
echo "1. 运行: bun run changeset"
echo "2. 选择包和版本类型"
echo "3. 运行: bun run version-packages"
echo "4. 运行: bun run release"
