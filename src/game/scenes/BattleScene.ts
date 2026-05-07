import Phaser from 'phaser';
import type { ActorState, AnimationEvent, CombatViewModel, EnemyState } from '../core/types';

const assetPath = '/assets/fanwork';

const actorTexture: Record<string, string> = {
  player: 'terara',
  'companion-xiaoyahu': 'xiaoyahu',
  'companion-shuangrenlang': 'shuangrenlang',
  'enemy-caiji': 'caiji',
  'enemy-yanjingjia': 'yanjingjia',
  'enemy-huandie': 'huandie',
  'enemy-qieyingzhiyi': 'qieyingzhiyi',
};

const spriteScale: Record<string, number> = {
  terara: 0.22,
  xiaoyahu: 0.2,
  shuangrenlang: 0.2,
  caiji: 0.19,
  yanjingjia: 0.18,
  huandie: 0.19,
  qieyingzhiyi: 0.24,
};

const actorHome: Record<string, { x: number; y: number; side: 'ally' | 'enemy' }> = {
  player: { x: 214, y: 346, side: 'ally' },
  'companion-xiaoyahu': { x: 390, y: 380, side: 'ally' },
  'companion-shuangrenlang': { x: 390, y: 380, side: 'ally' },
  'enemy-caiji': { x: 708, y: 350, side: 'enemy' },
  'enemy-yanjingjia': { x: 708, y: 350, side: 'enemy' },
  'enemy-huandie': { x: 708, y: 350, side: 'enemy' },
  'enemy-qieyingzhiyi': { x: 732, y: 310, side: 'enemy' },
};

export class BattleScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private fxRoot?: Phaser.GameObjects.Container;
  private ready = false;
  private pendingView: CombatViewModel | null | undefined;
  private lastEventId = '';
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private positions = new Map<string, { x: number; y: number; side: 'ally' | 'enemy' }>();
  private appearedActors = new Set<string>();

  constructor() {
    super('BattleScene');
  }

  preload() {
    this.load.image('battle-bg', `${assetPath}/background-starry-wilds.png`);
    Object.values(actorTexture).forEach((key) => {
      this.load.image(key, `${assetPath}/${key}.png`);
    });
  }

  create() {
    this.ready = true;
    (window as typeof window & { __battleScene?: BattleScene }).__battleScene = this;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
      const globalWindow = window as typeof window & { __battleScene?: BattleScene };
      if (globalWindow.__battleScene === this) {
        delete globalWindow.__battleScene;
      }
    });
    this.renderCombatView(this.pendingView ?? null);
  }

  renderCombatView(view: CombatViewModel | null) {
    this.pendingView = view;
    if (!this.ready) {
      return;
    }

    this.root?.destroy(true);
    this.fxRoot?.destroy(true);
    this.root = this.add.container(0, 0);
    this.fxRoot = this.add.container(0, 0);
    this.sprites.clear();
    this.positions.clear();

    if (!view) {
      this.appearedActors.clear();
      this.drawEmptyState();
      return;
    }

    this.drawBackground(view.turn);
    this.drawUnit(view.player, 'player', '忒拉拉', 'ally');
    this.drawUnit(view.companion, `companion-${view.companion.definitionId}`, view.companion.name, 'ally');
    view.enemies.forEach((enemy, index) => {
      this.drawEnemy(enemy, index);
    });
    this.drawLog(view);
    this.drawTurnBanner(view);
    this.playNewEvents(view);
    this.drawVictoryWash(view);
  }

  private drawEmptyState() {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);
    this.drawBackground(0);

    const title = this.add.text(480, 214, '蓝色星原：秘牌回响', {
      color: '#fff7ed',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '36px',
      fontStyle: '700',
      stroke: '#1e1b4b',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const hint = this.add.text(480, 260, '选择伙伴后进入战斗', {
      color: '#dbeafe',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '17px',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.root?.add([title, hint]);
  }

  private drawBackground(turn: number) {
    const bg = this.add.image(480, 270, 'battle-bg');
    bg.setDisplaySize(960, 540);
    bg.setTint(0xd9e8ff);

    const vignette = this.add.rectangle(480, 270, 960, 540, 0x020617, 0.2);
    const floorShade = this.add.ellipse(480, 440, 760, 86, 0x020617, 0.34);
    const turnLabel = this.add.text(32, 28, turn > 0 ? `第 ${turn} 回合` : '星原遭遇', {
      color: '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
      stroke: '#020617',
      strokeThickness: 4,
    });

    this.root?.add([bg, vignette, floorShade, turnLabel]);
  }

  private drawUnit(actor: ActorState, actorKey: string, label: string, side: 'ally' | 'enemy') {
    const base = actorHome[actorKey] ?? { x: 480, y: 350, side };
    const x = base.x;
    const y = base.y;
    const textureKey = actorTexture[actorKey];
    const shadow = this.add.ellipse(x, y + 66, 146, 26, 0x020617, 0.42);
    const sprite = this.add.image(x, y, textureKey).setOrigin(0.5, 0.78);
    const scale = spriteScale[textureKey] ?? 0.2;
    sprite.setScale(side === 'ally' ? -scale : scale, scale);
    sprite.setAlpha(actor.hp > 0 ? 1 : 0.34);
    sprite.setData('homeX', x);
    sprite.setData('homeY', y);
    sprite.setData('side', side);

    const name = this.add.text(x, y + 90, label, {
      color: '#f8fafc',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '16px',
      fontStyle: '700',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const bars = this.drawHealthPlate(actor, x, y + 112);
    this.root?.add([shadow, ...bars.decorations, sprite, name, ...bars.ui]);
    this.sprites.set(actor.id, sprite);
    this.positions.set(actor.id, { x, y, side });
    if (!this.appearedActors.has(actor.id)) {
      this.appearedActors.add(actor.id);
      this.playEntrance(sprite, side);
    }
  }

  private drawEnemy(enemy: EnemyState, index: number) {
    const actorKey = `enemy-${enemy.definitionId}`;
    const base = actorHome[actorKey] ?? { x: 708 + index * 96, y: 350, side: 'enemy' as const };
    this.drawUnit(enemy, actorKey, enemy.name, 'enemy');
    const { x, y } = base;
    const intent = this.add.container(x, y - 148);
    const badge = this.add.rectangle(0, 0, 150, 38, enemy.definitionId === 'qieyingzhiyi' ? 0x4c0519 : 0x1e1b4b, 0.82).setStrokeStyle(1, 0xfbbf24, 0.75);
    const text = this.add.text(0, 0, `${enemy.intent.label} ${enemy.intent.value}`, {
      color: '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
    }).setOrigin(0.5);
    intent.add([badge, text]);
    this.root?.add(intent);
    this.tweens.add({
      targets: intent,
      scale: enemy.definitionId === 'qieyingzhiyi' ? 1.08 : 1.04,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private drawHealthPlate(actor: ActorState, x: number, y: number) {
    const width = 132;
    const hpRatio = Math.max(0, actor.hp / actor.maxHp);
    const bg = this.add.rectangle(x, y, width, 12, 0x111827, 0.86).setStrokeStyle(1, 0x0f172a, 0.9);
    const hp = this.add.rectangle(x - width / 2 + (width * hpRatio) / 2, y, width * hpRatio, 8, 0xef4444, 0.95);
    const label = this.add.text(x, y + 18, `${actor.hp}/${actor.maxHp}  护盾 ${actor.block}`, {
      color: '#e2e8f0',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '12px',
      stroke: '#020617',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const statuses = this.add.text(x, y + 36, this.statusText(actor), {
      color: '#fde68a',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '11px',
      stroke: '#020617',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const shieldFlash = actor.block > 0 ? this.add.ellipse(x, y - 78, 130, 174, 0x7dd3fc, 0.08).setStrokeStyle(2, 0x7dd3fc, 0.22) : undefined;
    const statusFx = this.drawStatusLights(actor, x, y + 50);

    return {
      decorations: [shieldFlash].filter(Boolean) as Phaser.GameObjects.GameObject[],
      ui: [bg, hp, label, statuses, ...statusFx],
    };
  }

  private drawLog(view: CombatViewModel) {
    const box = this.add.rectangle(242, 92, 420, 78, 0x020617, 0.48).setStrokeStyle(1, 0x64748b, 0.42);
    const text = this.add.text(48, 60, view.log.slice(0, 4).join('\n'), {
      color: '#e2e8f0',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '13px',
      lineSpacing: 6,
      wordWrap: { width: 388 },
    });
    this.root?.add([box, text]);
  }

  private drawTurnBanner(view: CombatViewModel) {
    const banner = this.add.container(480, 118);
    const back = this.add.rectangle(0, 0, 150, 32, 0x020617, 0.42).setStrokeStyle(1, 0xfbbf24, 0.28);
    const text = this.add.text(0, 0, `第 ${view.turn} 回合`, {
      color: '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '18px',
      fontStyle: '700',
    }).setOrigin(0.5);
    banner.add([back, text]);
    this.root?.add(banner);
  }

  private playNewEvents(view: CombatViewModel) {
    const latestEvent = view.animationEvents[view.animationEvents.length - 1];
    if (!latestEvent || latestEvent.id === this.lastEventId) {
      return;
    }

    const lastIndex = view.animationEvents.findIndex((event) => event.id === this.lastEventId);
    const events = view.animationEvents.slice(lastIndex + 1);
    events.forEach((event, index) => {
      this.time.delayedCall(index * 120, () => this.playEvent(event));
    });
    this.lastEventId = latestEvent.id;
  }

  private playEvent(event: AnimationEvent) {
    if (event.type === 'attack') {
      this.cameras.main.shake(140, 0.004);
      this.playAttackMotion(event);
    }

    if (event.type === 'block') {
      this.playBlockFx(event);
    }

    if (event.type === 'heal') {
      this.playHealFx(event);
    }

    if (event.type === 'mark' || event.type === 'companion') {
      this.playStatusFx(event);
    }

    if (event.type === 'defeat') {
      this.playDefeatFx(event);
    }

    const text = this.add.text(480, 136, event.value ? `${event.label ?? ''} ${event.value}` : event.label ?? event.type, {
      color: event.type === 'attack' ? '#fecaca' : event.type === 'heal' ? '#bbf7d0' : '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '24px',
      fontStyle: '700',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.fxRoot?.add(text);
    this.tweens.add({
      targets: text,
      y: 98,
      alpha: 0,
      duration: 760,
      ease: 'Sine.out',
      onComplete: () => text.destroy(),
    });
  }

  private drawVictoryWash(view: CombatViewModel) {
    if (view.status === 'active') {
      return;
    }

    const color = view.status === 'won' ? 0x14532d : 0x450a0a;
    const wash = this.add.rectangle(480, 270, 960, 540, color, 0.18);
    this.root?.add(wash);
  }

  private playEntrance(sprite: Phaser.GameObjects.Image, side: 'ally' | 'enemy') {
    const homeX = sprite.getData('homeX') as number;
    sprite.setAlpha(sprite.alpha * 0.72);
    sprite.x = homeX + (side === 'ally' ? -18 : 18);
    this.tweens.add({
      targets: sprite,
      x: homeX,
      alpha: sprite.alpha > 0.4 ? 1 : 0.34,
      duration: 260,
      ease: 'Sine.out',
    });
  }

  private playAttackMotion(event: AnimationEvent) {
    const source = this.sprites.get(event.sourceId);
    const target = event.targetId ? this.sprites.get(event.targetId) : undefined;
    const sourceSide = (source?.getData('side') as 'ally' | 'enemy' | undefined) ?? 'ally';

    if (source) {
      this.tweens.add({
        targets: source,
        x: source.x + (sourceSide === 'ally' ? 26 : -26),
        duration: 92,
        yoyo: true,
        ease: 'Quad.out',
      });
    }

    if (target) {
      target.setTintFill(0xffffff);
      this.time.delayedCall(90, () => target.clearTint());
      this.tweens.add({
        targets: target,
        x: target.x + ((target.getData('side') as string) === 'ally' ? -13 : 13),
        duration: 96,
        yoyo: true,
        ease: 'Quad.out',
      });
      this.floatNumber(target.x, target.y - 128, `-${event.value ?? 0}`, '#fecaca');
      this.impactBurst(target.x, target.y - 72, 0xef4444);
    }
  }

  private playBlockFx(event: AnimationEvent) {
    const target = event.targetId ? this.positions.get(event.targetId) : undefined;
    if (!target) return;
    const ring = this.add.ellipse(target.x, target.y - 64, 136, 176, 0x7dd3fc, 0.1).setStrokeStyle(3, 0x7dd3fc, 0.72);
    this.fxRoot?.add(ring);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.16, duration: 520, ease: 'Sine.out', onComplete: () => ring.destroy() });
    this.floatNumber(target.x, target.y - 136, `护盾 +${event.value ?? 0}`, '#bae6fd');
  }

  private playHealFx(event: AnimationEvent) {
    const target = event.targetId ? this.positions.get(event.targetId) : undefined;
    if (!target) return;
    this.floatNumber(target.x, target.y - 136, `+${event.value ?? 0}`, '#bbf7d0');
    for (let index = 0; index < 6; index += 1) {
      const dot = this.add.circle(target.x + Phaser.Math.Between(-34, 34), target.y - 92 + Phaser.Math.Between(-18, 18), 4, 0x86efac, 0.85);
      this.fxRoot?.add(dot);
      this.tweens.add({ targets: dot, y: dot.y - 34, alpha: 0, duration: 560, delay: index * 26, onComplete: () => dot.destroy() });
    }
  }

  private playStatusFx(event: AnimationEvent) {
    const target = event.targetId ? this.positions.get(event.targetId) : undefined;
    if (!target) return;
    const color = event.label === '裂甲' ? 0xfb7185 : event.label?.includes('霜') ? 0x93c5fd : 0x86efac;
    this.impactBurst(target.x, target.y - 92, color);
    this.floatNumber(target.x, target.y - 138, event.label ?? '状态', color === 0xfb7185 ? '#fecdd3' : '#d9f99d');
  }

  private playDefeatFx(event: AnimationEvent) {
    const target = event.targetId ? this.sprites.get(event.targetId) : undefined;
    if (!target) return;
    this.tweens.add({ targets: target, alpha: 0.18, y: target.y + 12, angle: 4, duration: 320, ease: 'Sine.in' });
  }

  private impactBurst(x: number, y: number, color: number) {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const shard = this.add.rectangle(x, y, 16, 3, color, 0.88).setRotation(angle);
      this.fxRoot?.add(shard);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * 42,
        y: y + Math.sin(angle) * 28,
        alpha: 0,
        duration: 360,
        ease: 'Sine.out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private floatNumber(x: number, y: number, value: string, color: string) {
    const text = this.add.text(x, y, value, {
      color,
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.fxRoot?.add(text);
    this.tweens.add({ targets: text, y: y - 42, alpha: 0, duration: 680, ease: 'Sine.out', onComplete: () => text.destroy() });
  }

  private drawStatusLights(actor: ActorState, x: number, y: number) {
    const lights: Phaser.GameObjects.GameObject[] = [];
    const entries = [
      { value: actor.statuses.naturalMark, color: 0x86efac },
      { value: actor.statuses.fracture, color: 0xfb7185 },
      { value: actor.statuses.focus, color: 0x93c5fd },
    ].filter((entry) => entry.value);

    entries.forEach((entry, index) => {
      const dot = this.add.circle(x - 22 + index * 22, y, 5, entry.color, 0.95);
      lights.push(dot);
      this.tweens.add({ targets: dot, alpha: 0.38, scale: 1.38, yoyo: true, repeat: -1, duration: 700 + index * 120, ease: 'Sine.inOut' });
    });

    return lights;
  }

  private statusText(actor: ActorState) {
    const status = actor.statuses;
    const parts = [
      status.naturalMark ? `自然标记 ${status.naturalMark}` : '',
      status.fracture ? `裂甲 ${status.fracture}` : '',
      status.focus ? `专注 ${status.focus}` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join('  ') : '无状态';
  }
}
