import Phaser from 'phaser';
import type { ActorState, CombatViewModel, EnemyState } from '../core/types';

const palette = {
  player: 0x5eead4,
  companionNature: 0x86efac,
  companionFrost: 0x93c5fd,
  enemy: 0xfca5a5,
  boss: 0xc4b5fd,
  shield: 0x38bdf8,
  mark: 0xfacc15,
};

export class BattleScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private lastEventId = '';

  constructor() {
    super('BattleScene');
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

    this.drawBackground(view);
    this.drawActor(view.player, 230, 318, palette.player, '忒拉拉');
    this.drawActor(
      view.companion,
      380,
      348,
      view.companion.definitionId === 'xiaoyahu' ? palette.companionNature : palette.companionFrost,
      view.companion.name,
    );
    view.enemies.forEach((enemy, index) => {
      this.drawEnemy(enemy, 690 + index * 116, 300);
    });
    this.drawLog(view);
    this.playLatestEvent(view);
  }

  private drawEmptyState() {
    this.root?.destroy(true);
    this.root = this.add.container(0, 0);
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x07111f);
    const title = this.add.text(width / 2, height / 2 - 16, '蓝色星原：秘牌回响', {
      color: '#e0f2fe',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '28px',
      fontStyle: '700',
    }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height / 2 + 26, '选择伙伴后进入战斗', {
      color: '#94a3b8',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '16px',
    }).setOrigin(0.5);
    this.root.add([bg, title, hint]);
  }

  private drawBackground(view: CombatViewModel) {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x07111f);
    const horizon = this.add.rectangle(width / 2, 405, width, 2, 0x2dd4bf, 0.28);
    const grid = this.add.grid(width / 2, 410, width, 200, 48, 28, 0x000000, 0, 0x38bdf8, 0.1);
    const turn = this.add.text(34, 30, `第 ${view.turn} 回合`, {
      color: '#e0f2fe',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
    });
    this.root?.add([bg, grid, horizon, turn]);
  }

  private drawActor(actor: ActorState, x: number, y: number, color: number, label: string) {
    const body = this.add.circle(x, y, 38, color, actor.hp > 0 ? 1 : 0.25);
    const aura = this.add.circle(x, y, 52, color, 0.14);
    const name = this.add.text(x, y + 62, label, {
      color: '#f8fafc',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '17px',
      fontStyle: '700',
    }).setOrigin(0.5);
    const hp = this.add.text(x, y + 84, `${actor.hp}/${actor.maxHp} HP  护盾 ${actor.block}`, {
      color: '#cbd5e1',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '13px',
    }).setOrigin(0.5);
    const statuses = this.add.text(x, y + 104, this.statusText(actor), {
      color: '#fde68a',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '12px',
    }).setOrigin(0.5);

    this.root?.add([aura, body, name, hp, statuses]);
  }

  private drawEnemy(enemy: EnemyState, x: number, y: number) {
    const color = enemy.definitionId === 'qieyingzhiyi' ? palette.boss : palette.enemy;
    const shape = this.add.polygon(x, y, [0, -48, 46, -8, 30, 44, -30, 44, -46, -8], color, enemy.hp > 0 ? 0.95 : 0.22);
    const intent = this.add.text(x, y - 88, `${enemy.intent.label} ${enemy.intent.value}`, {
      color: '#fef3c7',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '15px',
      fontStyle: '700',
    }).setOrigin(0.5);
    const name = this.add.text(x, y + 70, enemy.name, {
      color: '#f8fafc',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '17px',
      fontStyle: '700',
    }).setOrigin(0.5);
    const hp = this.add.text(x, y + 92, `${enemy.hp}/${enemy.maxHp} HP  护盾 ${enemy.block}`, {
      color: '#cbd5e1',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '13px',
    }).setOrigin(0.5);
    const statuses = this.add.text(x, y + 112, this.statusText(enemy), {
      color: '#fde68a',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '12px',
    }).setOrigin(0.5);

    this.root?.add([shape, intent, name, hp, statuses]);
  }

  private drawLog(view: CombatViewModel) {
    const lines = view.log.slice(0, 4);
    const box = this.add.rectangle(250, 92, 430, 82, 0x020617, 0.58).setStrokeStyle(1, 0x334155, 0.8);
    const text = this.add.text(52, 60, lines.join('\n'), {
      color: '#cbd5e1',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '13px',
      lineSpacing: 6,
      wordWrap: { width: 390 },
    });
    this.root?.add([box, text]);
  }

  private playLatestEvent(view: CombatViewModel) {
    const event = view.animationEvents[view.animationEvents.length - 1];
    if (!event || event.id === this.lastEventId) {
      return;
    }

    this.lastEventId = event.id;
    const text = this.add.text(480, 145, event.label ?? event.type, {
      color: event.type === 'attack' ? '#fecaca' : '#bbf7d0',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
    }).setOrigin(0.5);
    this.root?.add(text);
    this.tweens.add({
      targets: text,
      y: 118,
      alpha: 0,
      duration: 680,
      ease: 'Sine.out',
      onComplete: () => text.destroy(),
    });
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
