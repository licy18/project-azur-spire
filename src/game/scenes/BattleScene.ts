import Phaser from 'phaser';
import type { ActorState, CombatViewModel, EnemyState } from '../core/types';

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

export class BattleScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private lastEventId = '';

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
    this.drawEmptyState();
  }

  renderCombatView(view: CombatViewModel | null) {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);

    if (!view) {
      this.drawEmptyState();
      return;
    }

    this.drawBackground(view.turn);
    this.drawUnit(view.player, 214, 346, 'player', '忒拉拉');
    this.drawUnit(view.companion, 390, 380, `companion-${view.companion.definitionId}`, view.companion.name);
    view.enemies.forEach((enemy, index) => {
      this.drawEnemy(enemy, 708 + index * 96, enemy.definitionId === 'qieyingzhiyi' ? 310 : 350);
    });
    this.drawLog(view);
    this.playLatestEvent(view);
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

  private drawUnit(actor: ActorState, x: number, y: number, actorKey: string, label: string) {
    const textureKey = actorTexture[actorKey];
    const shadow = this.add.ellipse(x, y + 66, 146, 26, 0x020617, 0.42);
    const sprite = this.add.image(x, y, textureKey).setOrigin(0.5, 0.78);
    sprite.setScale(spriteScale[textureKey] ?? 0.2);
    sprite.setAlpha(actor.hp > 0 ? 1 : 0.34);

    const name = this.add.text(x, y + 90, label, {
      color: '#f8fafc',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '16px',
      fontStyle: '700',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const bars = this.drawHealthPlate(actor, x, y + 112);
    this.root?.add([shadow, sprite, name, ...bars]);
  }

  private drawEnemy(enemy: EnemyState, x: number, y: number) {
    this.drawUnit(enemy, x, y, `enemy-${enemy.definitionId}`, enemy.name);
    const intent = this.add.container(x, y - 148);
    const badge = this.add.rectangle(0, 0, 150, 38, 0x1e1b4b, 0.78).setStrokeStyle(1, 0xfbbf24, 0.75);
    const text = this.add.text(0, 0, `${enemy.intent.label} ${enemy.intent.value}`, {
      color: '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
    }).setOrigin(0.5);
    intent.add([badge, text]);
    this.root?.add(intent);
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

    return [bg, hp, label, statuses];
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

  private playLatestEvent(view: CombatViewModel) {
    const event = view.animationEvents[view.animationEvents.length - 1];
    if (!event || event.id === this.lastEventId) {
      return;
    }

    this.lastEventId = event.id;

    if (event.type === 'attack') {
      this.cameras.main.shake(140, 0.004);
    }

    const text = this.add.text(480, 136, event.value ? `${event.label ?? ''} ${event.value}` : event.label ?? event.type, {
      color: event.type === 'attack' ? '#fecaca' : event.type === 'heal' ? '#bbf7d0' : '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '24px',
      fontStyle: '700',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.root?.add(text);
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
