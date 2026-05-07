import type {
  CardDefinition,
  CardInstance,
  CompanionDefinition,
  EnemyDefinition,
  EnemyId,
  NodeId,
  RelicDefinition,
  RunNode,
} from './types';

export const PLAYER_NAME = '忒拉拉';
export const PLAYER_MAX_HP = 70;

export const companions: Record<string, CompanionDefinition> = {
  xiaoyahu: {
    id: 'xiaoyahu',
    name: '小芽狐',
    element: 'nature',
    role: '自然/支援',
    maxHp: 28,
    passive: '未使用指令牌时，回合结束后为生命最低的友方提供 3 点护盾。',
  },
  shuangrenlang: {
    id: 'shuangrenlang',
    name: '霜刃狼',
    element: 'frost',
    role: '冰霜/追击',
    maxHp: 34,
    passive: '未使用指令牌时，回合结束后对带有自然标记的敌人造成 4 点追击伤害。',
  },
};

export const enemies: Record<EnemyId, EnemyDefinition> = {
  caiji: {
    id: 'caiji',
    name: '菜鸡',
    maxHp: 30,
    pattern: [
      { type: 'attack', label: '啄击', value: 7, target: 'player' },
      { type: 'mark', label: '扑腾', value: 2, target: 'player' },
      { type: 'attack', label: '连啄', value: 9, target: 'companion' },
    ],
  },
  yanjingjia: {
    id: 'yanjingjia',
    name: '炎晶甲',
    maxHp: 42,
    pattern: [
      { type: 'guard', label: '晶壳', value: 8, target: 'self' },
      { type: 'attack', label: '灼撞', value: 11, target: 'player' },
      { type: 'attack', label: '热浪', value: 6, target: 'both' },
    ],
  },
  huandie: {
    id: 'huandie',
    name: '幻蝶',
    maxHp: 36,
    pattern: [
      { type: 'mark', label: '迷粉', value: 2, target: 'player' },
      { type: 'attack', label: '幻翼', value: 8, target: 'companion' },
      { type: 'charge', label: '鳞光蓄势', value: 14, target: 'player' },
    ],
  },
  qieyingzhiyi: {
    id: 'qieyingzhiyi',
    name: '怯影之翼',
    maxHp: 72,
    pattern: [
      { type: 'attack', label: '影翼斩', value: 12, target: 'player' },
      { type: 'mark', label: '怯影凝视', value: 3, target: 'player' },
      { type: 'attack', label: '双翼压制', value: 8, target: 'both' },
      { type: 'charge', label: '暗潮俯冲', value: 18, target: 'player' },
    ],
  },
};

export const cards: Record<string, CardDefinition> = {
  star_slash: {
    id: 'star_slash',
    name: '星原斩',
    cost: 1,
    type: 'attack',
    target: 'enemy',
    description: '造成 6 点伤害。',
    originalName: false,
  },
  guard: {
    id: 'guard',
    name: '守势',
    cost: 1,
    type: 'skill',
    target: 'self',
    description: '获得 6 点护盾。',
    originalName: false,
  },
  leap_thrust: {
    id: 'leap_thrust',
    name: '跃刺',
    cost: 1,
    type: 'attack',
    target: 'enemy',
    description: '造成 8 点伤害。若目标有自然标记，额外造成 3 点伤害。',
    originalName: false,
  },
  track: {
    id: 'track',
    name: '追迹',
    cost: 1,
    type: 'skill',
    target: 'enemy',
    description: '施加 2 层自然标记，抽 1 张牌。',
    originalName: false,
  },
  harvest: {
    id: 'harvest',
    name: '药草大丰收',
    cost: 1,
    type: 'skill',
    target: 'self',
    description: '忒拉拉与伙伴各回复 4 点生命。',
    originalName: false,
  },
  shared_cover: {
    id: 'shared_cover',
    name: '陪伴',
    cost: 1,
    type: 'skill',
    target: 'companion',
    description: '忒拉拉和伙伴各获得 5 点护盾。',
    originalName: false,
  },
  sprout_command: {
    id: 'sprout_command',
    name: '小芽狐指令',
    cost: 1,
    type: 'command',
    target: 'enemy',
    description: '小芽狐施加 2 层自然标记，并为忒拉拉提供 5 点护盾。',
    originalName: false,
  },
  bloom_command: {
    id: 'bloom_command',
    name: '花叶守护指令',
    cost: 1,
    type: 'command',
    target: 'enemy',
    description: '小芽狐消耗 1 层自然标记，使忒拉拉与伙伴各回复 5 点生命。',
    originalName: false,
  },
  frost_command: {
    id: 'frost_command',
    name: '霜刃狼指令',
    cost: 1,
    type: 'command',
    target: 'enemy',
    description: '霜刃狼造成 7 点伤害；若目标有自然标记，消耗 1 层并额外造成 8 点伤害。',
    originalName: false,
  },
  break_command: {
    id: 'break_command',
    name: '破甲追袭指令',
    cost: 1,
    type: 'command',
    target: 'enemy',
    description: '霜刃狼造成 5 点伤害并施加 2 层裂甲。',
    originalName: false,
  },
  bond_spark: {
    id: 'bond_spark',
    name: '星愿共鸣',
    cost: 2,
    type: 'skill',
    target: 'self',
    description: '获得 2 层专注。本回合下一张攻击牌额外造成 4 点伤害。',
    originalName: false,
  },
  overrun: {
    id: 'overrun',
    name: '并肩突进',
    cost: 2,
    type: 'attack',
    target: 'enemy',
    description: '造成 10 点伤害。若本回合已使用指令牌，额外造成 8 点伤害。',
    originalName: false,
  },
};

export const relics: Record<string, RelicDefinition> = {
  leaf_charm: {
    id: 'leaf_charm',
    name: '叶脉护符',
    description: '每场战斗开始时，忒拉拉获得 3 点护盾。',
  },
  wolf_totem: {
    id: 'wolf_totem',
    name: '霜牙挂坠',
    description: '霜刃狼指令的额外追击伤害 +2。',
  },
  star_compass: {
    id: 'star_compass',
    name: '星旅罗盘',
    description: '每场战斗第一回合多抽 1 张牌。',
  },
};

export const route: RunNode[] = [
  { id: 'node-caiji', enemyId: 'caiji', name: '菜鸡', kind: 'normal', cleared: false },
  { id: 'node-yanjingjia', enemyId: 'yanjingjia', name: '炎晶甲', kind: 'normal', cleared: false },
  { id: 'node-huandie', enemyId: 'huandie', name: '幻蝶', kind: 'normal', cleared: false },
  { id: 'node-qieyingzhiyi', enemyId: 'qieyingzhiyi', name: '怯影之翼', kind: 'boss', cleared: false },
];

export const initialDeckCardIds = [
  'star_slash',
  'star_slash',
  'guard',
  'guard',
  'leap_thrust',
  'track',
  'harvest',
  'shared_cover',
  'sprout_command',
  'frost_command',
];

export const rewardPools = [
  ['leap_thrust', 'track', 'sprout_command'],
  ['shared_cover', 'break_command', 'bond_spark'],
  ['overrun', 'bloom_command', 'frost_command'],
];

export const commandCompanion: Record<string, 'xiaoyahu' | 'shuangrenlang'> = {
  sprout_command: 'xiaoyahu',
  bloom_command: 'xiaoyahu',
  frost_command: 'shuangrenlang',
  break_command: 'shuangrenlang',
};

export function createCardInstances(cardIds: string[], prefix: string): CardInstance[] {
  return cardIds.map((cardId, index) => ({
    cardId,
    instanceId: `${prefix}-${cardId}-${index + 1}`,
  }));
}

export function getNodeById(nodeId: NodeId) {
  return route.find((node) => node.id === nodeId);
}
