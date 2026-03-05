# Ninja Rush 1:1 复刻（Cocos Creator 3.8.8）

本项目已切换为基于 `ninja-rush` 源码的 Cocos 引擎复刻版本，目标是玩法与流程 1:1 对齐（纯前端 H5，无充值、无联网依赖）。

## 运行
1. 用 Cocos Creator 3.8.8 打开工程。
2. 打开场景 `assets/scenes/Main.scene`。
3. 点击预览运行。

## 当前对齐内容
- 核心逻辑：直接迁移 `Engine.ts`（生成、碰撞、连击、Fever、道具、结算）。
- 核心渲染：迁移 `Renderer.ts`，通过 `CocosCanvas2DAdapter` 适配 Cocos `Graphics`。
- UI 流程：`menu -> playing -> gameover` 与原版一致。
- 输入：点击/触摸按下与抬起行为对齐（按住冲刺、点击换边）。
- 结算：重开与返回大厅按钮行为对齐。

## 关键文件
- 入口桥接：`assets/scripts/NinjaAssaultGame.ts`
- 复刻主控：`assets/scripts/ninja_rush_port/NinjaRushPortGame.ts`
- 逻辑：`assets/scripts/ninja_rush_port/core/Engine.ts`
- 渲染：`assets/scripts/ninja_rush_port/core/Renderer.ts`
- Canvas 适配：`assets/scripts/ninja_rush_port/core/CocosCanvas2DAdapter.ts`

## H5 构建
1. 构建目标选择 `Web Mobile`（或 `Web Desktop`）。
2. 方向设置为 `Portrait`（竖屏）。
3. 构建后直接静态托管即可运行。

## 说明
- 命令行 `tsc` 可能提示缺少 `cc` 类型声明；这是命令行环境限制，不影响在 Cocos Creator 内运行。
- 若首次打开有 `.meta` 自动刷新，属于正常现象。
