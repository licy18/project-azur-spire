# Project Azur Spire

English | [中文](README.zh-CN.md)

A desktop vertical slice for **蓝色星原：秘牌回响**, built with Vite, React, TypeScript, Phaser 3, and Electron under the project name **Project Azur Spire**. This prototype explores a companion-synergy card battle loop inspired by deckbuilding roguelikes, using officially authorized Azur Promilia names and fan-created placeholder depictions.

## Prototype

- Flow: companion choice -> route node -> battle -> reward -> next node -> boss -> result.
- Player character: Terara / 忒拉拉.
- Companions: 小芽狐 and 霜刃狼. One companion is chosen before each battle.
- Route: 菜鸡 -> 炎晶甲 -> 幻蝶 -> 怯影之翼.
- Combat: 3 energy per turn, draw 5 cards, enemy intent preview, one command card per turn, companion HP and elemental synergy.
- UI direction: Slay-the-Spire-like readable desktop structure, with a large Phaser battlefield, fixed bottom hand, compact right rail, companion choice panels, rewards, and result flow.
- React owns HUD, cards, route, rewards, and flow state. Phaser renders the battlefield from read-only combat snapshots.
- Current visual pass: allied units are mirrored at render time to face right, enemies face left, and combat now includes entrance motion, hit feedback, floating numbers, status flashes, shield/heal effects, and clearer playable/disabled card states.

## Authorization And Assets

This project is being developed under official collaboration authorization. Official names and fan-created depictions are allowed for this build, but copied/cropped/extracted official art assets must not be used.

Reference priority:

- [Official Chinese website](https://azurpromilia.manjuu.com/zh/home/)
- [Official Chinese Wiki / BWIKI](https://wiki.biligame.com/ap/)

Fanwork asset tracking lives in `public/assets/fanwork/manifest.json`. Current unit cutouts include Terara, 小芽狐, 霜刃狼, 菜鸡, 炎晶甲, 幻蝶, and a regenerated 怯影之翼 boss image based on the user-provided official reference. Official reference images are not stored in the project.

## Scripts

```bash
npm run dev
```

Starts Vite, compiles Electron main/preload scripts, and opens the Electron window.

```bash
npm run test
```

Runs Vitest unit tests for the pure combat/run engine.

```bash
npm run typecheck
```

Checks both renderer and Electron TypeScript projects.

```bash
npm run build
```

Builds the React renderer into `dist/` and Electron scripts into `dist-electron/`.

## Structure

```text
electron/
  main.ts                 Electron main process
  preload.ts              Isolated preload bridge
src/
  App.tsx                 React state container
  ui/VerticalSliceView.tsx Desktop flow, HUD, cards, rail, rewards, and result UI
  game/
    Game.ts               Phaser game bootstrapping
    core/                 Pure TypeScript run/combat rules and tests
    scenes/BattleScene.ts Phaser battlefield renderer
public/assets/fanwork/
  manifest.json           Fanwork asset policy and tracking
```

Documentation updates should keep this README and the Chinese version in sync.
