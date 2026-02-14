/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Git Standards 主入口
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

// 导出配置生成器
export * from "./configs/lint-staged";

// 导出 CLI 命令
export { init } from "./cli/init";
export { doctor } from "./cli/doctor";

// 导出工具函数
export * from "./utils/package-manager";
export * from "./utils/git";
export * from "./utils/file";
