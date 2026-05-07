# 蓝色星原：秘牌回响

[English](README.md) | 中文

这是一个使用 Vite、React、TypeScript、Phaser 3 和 Electron 构建的 **《蓝色星原：秘牌回响》**桌面 vertical slice，项目名称为 **Project Azur Spire**。项目用于验证“卡牌战斗 + 奇波伙伴连携”的核心循环，并在官方合作授权范围内使用《蓝色星原：旅谣》的官方命名和二创形象。

## 原型内容

- 流程：伙伴选择 -> 路线节点 -> 战斗 -> 奖励 -> 下一节点 -> Boss -> 结算。
- 主角：忒拉拉。
- 伙伴：小芽狐、霜刃狼。每场战斗前二选一上场。
- 路线：菜鸡 -> 炎晶甲 -> 幻蝶 -> 怯影之翼。
- 战斗：每回合 3 能量、抽 5 张牌、敌人意图预告、每回合 1 张指令牌、伙伴独立 HP、元素连携。
- UI 方向：参考杀戮尖塔式的高可读桌面结构，包含上方 Phaser 大战场、底部固定手牌、右侧紧凑信息栏、伙伴选择面板、奖励和结算流程。
- React 负责 HUD、手牌、路线、奖励和流程状态；Phaser 根据只读战斗快照渲染战场。

## 授权与素材

本项目已获得官方合作授权。当前构建允许使用官方命名和二创形象，但不能直接使用、裁切、提取或复制官方美术素材。

设定与命名参考优先级：

- [《蓝色星原：旅谣》官方中文网站](https://azurpromilia.manjuu.com/zh/home/)
- [官方中文 Wiki / BWIKI](https://wiki.biligame.com/ap/)

二创素材追踪文件位于 `public/assets/fanwork/manifest.json`。当前单位透明图包含忒拉拉、小芽狐、霜刃狼、菜鸡、炎晶甲、幻蝶，以及基于用户提供官方参考图重生成的怯影之翼 Boss 形象。官方参考图不保存进项目。

## 脚本

```bash
npm run dev
```

启动 Vite，监听编译 Electron 主进程和 preload 脚本，并打开 Electron 窗口。

```bash
npm run test
```

运行纯规则层的 Vitest 单元测试。

```bash
npm run typecheck
```

同时检查渲染进程和 Electron TypeScript 项目。

```bash
npm run build
```

将 React 渲染进程构建到 `dist/`，并将 Electron 脚本构建到 `dist-electron/`。

## 目录结构

```text
electron/
  main.ts                 Electron 主进程
  preload.ts              隔离上下文下的 preload bridge
src/
  App.tsx                 React 状态容器
  ui/VerticalSliceView.tsx 桌面流程、HUD、手牌、侧栏、奖励和结算 UI
  game/
    Game.ts               Phaser 游戏启动配置
    core/                 纯 TypeScript 跑团/战斗规则和测试
    scenes/BattleScene.ts Phaser 战场渲染器
public/assets/fanwork/
  manifest.json           二创素材策略和追踪
```

后续文档更新请同时维护英文版和中文版，保持两边内容同步。
