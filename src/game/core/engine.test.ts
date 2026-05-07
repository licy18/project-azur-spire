import { describe, expect, it } from 'vitest';
import {
  chooseReward,
  createInitialRun,
  endTurn,
  finishCombat,
  getCurrentNode,
  getRewardOptions,
  playCard,
  selectCompanion,
  startCombat,
} from './engine';

function findCardId(state: ReturnType<typeof startCombat>, cardId: string) {
  return (
    state.hand.find((card) => card.cardId === cardId) ??
    state.drawPile.find((card) => card.cardId === cardId) ??
    state.discardPile.find((card) => card.cardId === cardId)
  );
}

function moveCardToHand(state: ReturnType<typeof startCombat>, cardId: string) {
  const card = findCardId(state, cardId);
  if (!card) {
    throw new Error(`Missing card: ${cardId}`);
  }

  return {
    ...state,
    hand: [card],
    drawPile: state.drawPile.filter((candidate) => candidate.instanceId !== card.instanceId),
    discardPile: state.discardPile.filter((candidate) => candidate.instanceId !== card.instanceId),
  };
}

describe('vertical slice combat engine', () => {
  it('creates a fixed route and supports companion selection', () => {
    const run = selectCompanion(createInitialRun('test'), 'shuangrenlang');

    expect(run.selectedCompanionId).toBe('shuangrenlang');
    expect(run.route.map((node) => node.name)).toEqual(['菜鸡', '炎晶甲', '幻蝶', '怯影之翼']);
  });

  it('draws an opening hand and spends energy when a card is played', () => {
    const run = createInitialRun('energy');
    const combat = startCombat(run, 'node-caiji');
    const card = combat.hand[0];
    const next = playCard(combat, card.instanceId, combat.enemies[0].id);

    expect(combat.hand).toHaveLength(5);
    expect(next.energy).toBeLessThan(combat.energy);
    expect(next.discardPile.some((candidate) => candidate.instanceId === card.instanceId)).toBe(true);
  });

  it('limits command cards to one per turn', () => {
    const run = selectCompanion(createInitialRun('command'), 'shuangrenlang');
    const combat = startCombat(run, 'node-caiji');
    const command = findCardId(combat, 'frost_command');
    if (!command) throw new Error('frost command missing');
    const prepared = { ...combat, hand: [command, { ...command, instanceId: 'copy-command' }], energy: 3 };

    const first = playCard(prepared, command.instanceId, prepared.enemies[0].id);
    const second = playCard(first, 'copy-command', first.enemies[0].id);

    expect(first.commandUsedThisTurn).toBe(true);
    expect(second.hand.some((card) => card.instanceId === 'copy-command')).toBe(true);
    expect(second.log[0]).toContain('本回合已经使用过指令牌');
  });

  it('prevents the inactive companion from answering a command', () => {
    const run = selectCompanion(createInitialRun('wrong-command'), 'xiaoyahu');
    const combat = startCombat(run, 'node-caiji');
    const command = findCardId(combat, 'frost_command');
    if (!command) throw new Error('frost command missing');
    const prepared = { ...combat, hand: [command], energy: 3 };

    const next = playCard(prepared, command.instanceId, prepared.enemies[0].id);

    expect(next.energy).toBe(3);
    expect(next.log[0]).toContain('无法响应');
  });

  it('lets Frostblade Wolf consume natural mark for bonus damage', () => {
    const run = selectCompanion(createInitialRun('mark'), 'shuangrenlang');
    const combat = moveCardToHand(startCombat(run, 'node-caiji'), 'track');
    const marked = playCard(combat, combat.hand[0].instanceId, combat.enemies[0].id);
    const withCommand = moveCardToHand({ ...marked, energy: 3 }, 'frost_command');
    const beforeHp = withCommand.enemies[0].hp;
    const after = playCard(withCommand, withCommand.hand[0].instanceId, withCommand.enemies[0].id);

    expect(beforeHp - after.enemies[0].hp).toBeGreaterThanOrEqual(15);
    expect(after.enemies[0].statuses.naturalMark).toBe(1);
  });

  it('keeps the player alive when the companion falls', () => {
    const run = createInitialRun('companion-down');
    const combat = startCombat(run, 'node-huandie');
    const next = endTurn({
      ...combat,
      companion: { ...combat.companion, hp: 1, block: 0 },
      enemies: [{ ...combat.enemies[0], intent: { type: 'attack', label: '测试', value: 8, target: 'companion' } }],
      hand: [],
    });

    expect(next.companion.hp).toBe(0);
    expect(next.status).toBe('active');
  });

  it('keeps enemy guard intent active for the next player turn', () => {
    const run = createInitialRun('guard-intent');
    const combat = {
      ...startCombat(run, 'node-yanjingjia'),
      hand: [],
    };
    const next = endTurn(combat);

    expect(next.enemies[0].block).toBe(8);
    expect(next.turn).toBe(2);
  });

  it('advances the run after a win and adds rewards', () => {
    const run = createInitialRun('reward');
    const combat = {
      ...startCombat(run, 'node-caiji'),
      status: 'won' as const,
      player: { ...startCombat(run, 'node-caiji').player, hp: 60 },
    };
    const advanced = finishCombat(run, combat);
    const reward = getRewardOptions(advanced)[0];
    const rewarded = chooseReward(advanced, reward.id);

    expect(getCurrentNode(advanced).id).toBe('node-yanjingjia');
    expect(rewarded.deck.length).toBe(run.deck.length + 1);
  });
});
