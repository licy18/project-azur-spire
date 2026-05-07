import {
  cards,
  commandCompanion,
  companions,
  createCardInstances,
  enemies,
  initialDeckCardIds,
  PLAYER_MAX_HP,
  PLAYER_NAME,
  relics,
  rewardPools,
  route,
} from './content';
import { hashSeed, nextRandom, shuffle } from './rng';
import type {
  ActorState,
  AnimationEvent,
  CardInstance,
  CompanionId,
  CombatState,
  NodeId,
  RewardOption,
  RunState,
} from './types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createActor(id: string, name: string, maxHp: number): ActorState {
  return {
    id,
    name,
    hp: maxHp,
    maxHp,
    block: 0,
    statuses: {},
  };
}

function addEvent(state: CombatState, event: Omit<AnimationEvent, 'id'>) {
  state.animationEvents.push({
    id: `${state.id}-turn-${state.turn}-event-${state.animationEvents.length + 1}`,
    ...event,
  });
}

function addLog(state: CombatState, message: string) {
  state.log = [message, ...state.log].slice(0, 8);
}

function block(actor: ActorState, amount: number) {
  actor.block += amount;
}

function heal(actor: ActorState, amount: number) {
  actor.hp = Math.min(actor.maxHp, actor.hp + amount);
}

function applyStatus(actor: ActorState, key: 'naturalMark' | 'fracture' | 'focus', amount: number) {
  actor.statuses[key] = Math.max(0, (actor.statuses[key] ?? 0) + amount);
  if (actor.statuses[key] === 0) {
    delete actor.statuses[key];
  }
}

function alive(actor: ActorState) {
  return actor.hp > 0;
}

function dealDamage(state: CombatState, sourceId: string, target: ActorState, amount: number, label = '伤害') {
  const fractureBonus = target.statuses.fracture ?? 0;
  const focusBonus = sourceId === 'player' && (state.player.statuses.focus ?? 0) > 0 ? 4 : 0;
  const finalAmount = amount + fractureBonus + focusBonus;
  const blocked = Math.min(target.block, finalAmount);
  target.block -= blocked;
  target.hp = Math.max(0, target.hp - (finalAmount - blocked));

  if (focusBonus > 0) {
    applyStatus(state.player, 'focus', -1);
  }

  addEvent(state, { type: 'attack', sourceId, targetId: target.id, value: finalAmount, label });
  addLog(state, `${label}：${target.name} 受到 ${finalAmount} 点伤害。`);

  if (!alive(target)) {
    addEvent(state, { type: 'defeat', sourceId, targetId: target.id, label: `${target.name} 倒下` });
  }
}

function getEnemy(state: CombatState, targetId?: string) {
  return state.enemies.find((enemy) => enemy.id === targetId && alive(enemy)) ?? state.enemies.find(alive);
}

function drawCards(state: CombatState, count: number) {
  for (let index = 0; index < count; index += 1) {
    if (state.drawPile.length === 0 && state.discardPile.length > 0) {
      const shuffled = shuffle(state.discardPile, state.rng);
      state.drawPile = shuffled.items;
      state.discardPile = [];
      state.rng = shuffled.rng;
      addLog(state, '弃牌堆洗回抽牌堆。');
    }

    const nextCard = state.drawPile.shift();
    if (!nextCard) {
      return;
    }

    state.hand.push(nextCard);
  }
}

function setEnemyIntents(state: CombatState) {
  state.enemies.forEach((enemy) => {
    const definition = enemies[enemy.definitionId];
    enemy.intent = definition.pattern[(state.turn - 1) % definition.pattern.length];
  });
}

function resetPlayerTurn(state: CombatState) {
  state.energy = state.maxEnergy;
  state.commandUsedThisTurn = false;
  state.player.block = 0;
  state.companion.block = 0;
}

function checkCombatStatus(state: CombatState) {
  if (!alive(state.player)) {
    state.status = 'lost';
    addLog(state, '忒拉拉无法继续战斗。');
    return;
  }

  if (state.enemies.every((enemy) => !alive(enemy))) {
    state.status = 'won';
    addLog(state, '战斗胜利。');
  }
}

function companionDefaultAction(state: CombatState) {
  if (state.commandUsedThisTurn || !alive(state.companion)) {
    return;
  }

  if (state.companion.definitionId === 'xiaoyahu') {
    const target = state.player.hp / state.player.maxHp <= state.companion.hp / state.companion.maxHp ? state.player : state.companion;
    block(target, 3);
    addEvent(state, { type: 'block', sourceId: state.companion.id, targetId: target.id, value: 3, label: '小芽狐守护' });
    addLog(state, '小芽狐轻轻守护生命最低的友方。');
    return;
  }

  const markedEnemy = state.enemies.find((enemy) => alive(enemy) && (enemy.statuses.naturalMark ?? 0) > 0);
  if (markedEnemy) {
    dealDamage(state, state.companion.id, markedEnemy, 4, '霜刃追击');
  }
}

function resolveEnemyIntent(state: CombatState) {
  state.enemies.filter(alive).forEach((enemy) => {
    const { intent } = enemy;

    if (intent.type === 'guard') {
      block(enemy, intent.value);
      addEvent(state, { type: 'block', sourceId: enemy.id, targetId: enemy.id, value: intent.value, label: intent.label });
      addLog(state, `${enemy.name} 使用 ${intent.label}，获得 ${intent.value} 点护盾。`);
      return;
    }

    if (intent.type === 'mark') {
      applyStatus(state.player, 'fracture', intent.value);
      addEvent(state, { type: 'mark', sourceId: enemy.id, targetId: state.player.id, value: intent.value, label: intent.label });
      addLog(state, `${enemy.name} 使用 ${intent.label}，忒拉拉获得 ${intent.value} 层裂甲。`);
      return;
    }

    const value = intent.value;
    if (intent.target === 'both') {
      dealDamage(state, enemy.id, state.player, value, intent.label);
      if (alive(state.companion)) {
        dealDamage(state, enemy.id, state.companion, value, intent.label);
      }
      return;
    }

    const target = intent.target === 'companion' && alive(state.companion) ? state.companion : state.player;
    dealDamage(state, enemy.id, target, value, intent.label);
  });
}

export function createInitialRun(seed: string): RunState {
  return {
    seed,
    route: route.map((node) => ({ ...node })),
    currentNodeIndex: 0,
    deck: createCardInstances(initialDeckCardIds, 'starter'),
    relics: ['leaf_charm'],
    unlockedCompanions: ['xiaoyahu', 'shuangrenlang'],
    selectedCompanionId: 'xiaoyahu',
    playerHp: PLAYER_MAX_HP,
    completed: false,
  };
}

export function selectCompanion(run: RunState, companionId: CompanionId): RunState {
  if (!run.unlockedCompanions.includes(companionId)) {
    return run;
  }

  return {
    ...clone(run),
    selectedCompanionId: companionId,
  };
}

export function startCombat(run: RunState, nodeId: NodeId): CombatState {
  const node = run.route.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`Unknown node: ${nodeId}`);
  }

  const enemyDefinition = enemies[node.enemyId];
  const companionDefinition = companions[run.selectedCompanionId];
  const rng = hashSeed(`${run.seed}-${nodeId}-${run.selectedCompanionId}`);
  const shuffled = shuffle(run.deck, rng);
  const enemy = createActor(`enemy-${enemyDefinition.id}`, enemyDefinition.name, enemyDefinition.maxHp);
  const combat: CombatState = {
    id: `${nodeId}-${run.selectedCompanionId}`,
    nodeId,
    turn: 1,
    maxEnergy: 3,
    energy: 3,
    player: createActor('player', PLAYER_NAME, PLAYER_MAX_HP),
    companion: {
      ...createActor(`companion-${companionDefinition.id}`, companionDefinition.name, companionDefinition.maxHp),
      definitionId: companionDefinition.id,
    },
    enemies: [
      {
        ...enemy,
        definitionId: enemyDefinition.id,
        intent: enemyDefinition.pattern[0],
      },
    ],
    drawPile: shuffled.items,
    hand: [],
    discardPile: [],
    exhaustedPile: [],
    commandUsedThisTurn: false,
    status: 'active',
    log: [`${companionDefinition.name} 加入本场战斗。`],
    animationEvents: [],
    rng: shuffled.rng,
  };

  combat.player.hp = run.playerHp;

  if (run.relics.includes('leaf_charm')) {
    block(combat.player, 3);
  }

  drawCards(combat, run.relics.includes('star_compass') ? 6 : 5);
  setEnemyIntents(combat);
  return combat;
}

export function playCard(combatState: CombatState, cardInstanceId: string, targetId?: string): CombatState {
  const state = clone(combatState);
  if (state.status !== 'active') {
    return state;
  }

  state.animationEvents = [];
  const cardIndex = state.hand.findIndex((card) => card.instanceId === cardInstanceId);
  const cardInstance = state.hand[cardIndex];
  if (!cardInstance) {
    return state;
  }

  const card = cards[cardInstance.cardId];
  if (state.energy < card.cost) {
    addLog(state, '能量不足。');
    return state;
  }

  if (card.type === 'command') {
    if (commandCompanion[card.id] !== state.companion.definitionId) {
      addLog(state, `${state.companion.name} 无法响应这张指令牌。`);
      return state;
    }

    if (state.commandUsedThisTurn) {
      addLog(state, '本回合已经使用过指令牌。');
      return state;
    }

    if (!alive(state.companion)) {
      addLog(state, '伙伴已倒下，无法响应指令。');
      return state;
    }
  }

  const target = getEnemy(state, targetId);
  state.energy -= card.cost;
  state.hand.splice(cardIndex, 1);
  state.discardPile.push(cardInstance);

  switch (card.id) {
    case 'star_slash':
      if (target) dealDamage(state, state.player.id, target, 6, card.name);
      break;
    case 'guard':
      block(state.player, 6);
      addEvent(state, { type: 'block', sourceId: state.player.id, targetId: state.player.id, value: 6, label: card.name });
      addLog(state, '忒拉拉获得 6 点护盾。');
      break;
    case 'leap_thrust':
      if (target) dealDamage(state, state.player.id, target, (target.statuses.naturalMark ?? 0) > 0 ? 11 : 8, card.name);
      break;
    case 'track':
      if (target) {
        applyStatus(target, 'naturalMark', 2);
        addEvent(state, { type: 'mark', sourceId: state.player.id, targetId: target.id, value: 2, label: card.name });
        addLog(state, `${target.name} 获得 2 层自然标记。`);
      }
      drawCards(state, 1);
      break;
    case 'harvest':
      heal(state.player, 4);
      heal(state.companion, 4);
      addEvent(state, { type: 'heal', sourceId: state.player.id, targetId: state.player.id, value: 4, label: card.name });
      addEvent(state, { type: 'heal', sourceId: state.player.id, targetId: state.companion.id, value: 4, label: card.name });
      addLog(state, '忒拉拉与伙伴各回复 4 点生命。');
      break;
    case 'shared_cover':
      block(state.player, 5);
      block(state.companion, 5);
      addEvent(state, { type: 'block', sourceId: state.player.id, targetId: state.player.id, value: 5, label: card.name });
      addEvent(state, { type: 'block', sourceId: state.player.id, targetId: state.companion.id, value: 5, label: card.name });
      addLog(state, '忒拉拉与伙伴并肩防守。');
      break;
    case 'sprout_command':
      state.commandUsedThisTurn = true;
      if (target) {
        applyStatus(target, 'naturalMark', 2);
        addEvent(state, { type: 'companion', sourceId: state.companion.id, targetId: target.id, value: 2, label: card.name });
      }
      block(state.player, 5);
      addLog(state, '小芽狐响应指令，留下自然标记并展开守护。');
      break;
    case 'bloom_command':
      state.commandUsedThisTurn = true;
      if (target && (target.statuses.naturalMark ?? 0) > 0) {
        applyStatus(target, 'naturalMark', -1);
      }
      heal(state.player, 5);
      heal(state.companion, 5);
      addEvent(state, { type: 'heal', sourceId: state.companion.id, targetId: state.player.id, value: 5, label: card.name });
      addEvent(state, { type: 'heal', sourceId: state.companion.id, targetId: state.companion.id, value: 5, label: card.name });
      addLog(state, '小芽狐将标记转化为花叶守护。');
      break;
    case 'frost_command': {
      state.commandUsedThisTurn = true;
      if (target) {
        const hasMark = (target.statuses.naturalMark ?? 0) > 0;
        if (hasMark) {
          applyStatus(target, 'naturalMark', -1);
        }
        dealDamage(state, state.companion.id, target, hasMark ? 15 : 7, card.name);
      }
      break;
    }
    case 'break_command':
      state.commandUsedThisTurn = true;
      if (target) {
        dealDamage(state, state.companion.id, target, 5, card.name);
        applyStatus(target, 'fracture', 2);
        addEvent(state, { type: 'mark', sourceId: state.companion.id, targetId: target.id, value: 2, label: '裂甲' });
      }
      break;
    case 'bond_spark':
      applyStatus(state.player, 'focus', 2);
      addEvent(state, { type: 'mark', sourceId: state.player.id, targetId: state.player.id, value: 2, label: card.name });
      addLog(state, '忒拉拉进入星愿共鸣。');
      break;
    case 'overrun':
      if (target) dealDamage(state, state.player.id, target, state.commandUsedThisTurn ? 18 : 10, card.name);
      break;
    default:
      addLog(state, `${card.name} 尚未实现。`);
  }

  checkCombatStatus(state);
  return state;
}

export function endTurn(combatState: CombatState): CombatState {
  const state = clone(combatState);
  if (state.status !== 'active') {
    return state;
  }

  state.animationEvents = [];
  companionDefaultAction(state);
  checkCombatStatus(state);
  if (state.status !== 'active') {
    return state;
  }

  state.enemies.forEach((enemy) => {
    enemy.block = 0;
  });
  resolveEnemyIntent(state);
  checkCombatStatus(state);
  if (state.status !== 'active') {
    return state;
  }

  state.discardPile.push(...state.hand);
  state.hand = [];
  state.turn += 1;
  state.rng = nextRandom(state.rng);
  resetPlayerTurn(state);
  setEnemyIntents(state);
  drawCards(state, 5);
  addLog(state, `第 ${state.turn} 回合开始。`);
  return state;
}

export function finishCombat(runState: RunState, combatState: CombatState): RunState {
  const run = clone(runState);
  run.playerHp = Math.max(1, combatState.player.hp);
  const nodeIndex = run.route.findIndex((node) => node.id === combatState.nodeId);
  if (nodeIndex >= 0) {
    run.route[nodeIndex].cleared = true;
    run.currentNodeIndex = Math.min(nodeIndex + 1, run.route.length - 1);
  }
  run.completed = run.route.every((node) => node.cleared);
  return run;
}

export function getRewardOptions(run: RunState): RewardOption[] {
  const rewardIndex = Math.max(0, Math.min(run.currentNodeIndex - 1, rewardPools.length - 1));
  const pool = rewardPools[rewardIndex];
  const cardRewards = pool.map((cardId) => ({
    id: `reward-card-${cardId}`,
    kind: 'card' as const,
    cardId,
    label: cards[cardId].name,
    description: cards[cardId].description,
  }));

  if (run.currentNodeIndex === 2 && !run.relics.includes('wolf_totem')) {
    return [
      ...cardRewards.slice(0, 2),
      {
        id: 'reward-relic-wolf_totem',
        kind: 'relic' as const,
        relicId: 'wolf_totem',
        label: relics.wolf_totem.name,
        description: relics.wolf_totem.description,
      },
    ];
  }

  return cardRewards;
}

export function chooseReward(runState: RunState, rewardId: string): RunState {
  const run = clone(runState);
  const reward = getRewardOptions(run).find((option) => option.id === rewardId);
  if (!reward) {
    return run;
  }

  if (reward.kind === 'card' && reward.cardId) {
    run.deck.push({
      cardId: reward.cardId,
      instanceId: `reward-${reward.cardId}-${run.deck.length + 1}`,
    });
  }

  if (reward.kind === 'relic' && reward.relicId && !run.relics.includes(reward.relicId)) {
    run.relics.push(reward.relicId);
  }

  return run;
}

export function toCombatViewModel(state: CombatState) {
  return {
    status: state.status,
    turn: state.turn,
    player: state.player,
    companion: state.companion,
    enemies: state.enemies,
    log: state.log,
    animationEvents: state.animationEvents,
  };
}

export function getCurrentNode(run: RunState) {
  return run.route[run.currentNodeIndex];
}

export function getCardDefinition(card: CardInstance) {
  return cards[card.cardId];
}
