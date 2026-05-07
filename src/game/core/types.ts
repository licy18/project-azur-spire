export type CompanionId = 'xiaoyahu' | 'shuangrenlang';
export type EnemyId = 'caiji' | 'yanjingjia' | 'huandie' | 'qieyingzhiyi';
export type NodeId = 'node-caiji' | 'node-yanjingjia' | 'node-huandie' | 'node-qieyingzhiyi';
export type CardType = 'attack' | 'skill' | 'command';
export type CardTarget = 'enemy' | 'self' | 'companion' | 'none';
export type CombatStatus = 'active' | 'won' | 'lost';
export type IntentType = 'attack' | 'guard' | 'mark' | 'charge';
export type StatusKey = 'naturalMark' | 'fracture' | 'focus';

export interface ActorState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Partial<Record<StatusKey, number>>;
}

export interface CompanionDefinition {
  id: CompanionId;
  name: string;
  element: 'nature' | 'frost';
  role: string;
  maxHp: number;
  passive: string;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHp: number;
  pattern: EnemyIntent[];
}

export interface EnemyState extends ActorState {
  definitionId: EnemyId;
  intent: EnemyIntent;
}

export interface EnemyIntent {
  type: IntentType;
  label: string;
  value: number;
  target: 'player' | 'companion' | 'both' | 'self';
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  target: CardTarget;
  description: string;
  originalName: boolean;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
}

export interface RunNode {
  id: NodeId;
  enemyId: EnemyId;
  name: string;
  kind: 'normal' | 'boss';
  cleared: boolean;
}

export interface RunState {
  seed: string;
  route: RunNode[];
  currentNodeIndex: number;
  deck: CardInstance[];
  relics: string[];
  unlockedCompanions: CompanionId[];
  selectedCompanionId: CompanionId;
  playerHp: number;
  completed: boolean;
}

export interface AnimationEvent {
  id: string;
  type: 'attack' | 'block' | 'heal' | 'mark' | 'defeat' | 'companion';
  sourceId: string;
  targetId?: string;
  value?: number;
  label?: string;
}

export interface CombatState {
  id: string;
  nodeId: NodeId;
  turn: number;
  maxEnergy: number;
  energy: number;
  player: ActorState;
  companion: ActorState & { definitionId: CompanionId };
  enemies: EnemyState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustedPile: CardInstance[];
  commandUsedThisTurn: boolean;
  status: CombatStatus;
  log: string[];
  animationEvents: AnimationEvent[];
  rng: number;
}

export interface RewardOption {
  id: string;
  kind: 'card' | 'relic';
  cardId?: string;
  relicId?: string;
  label: string;
  description: string;
}

export interface CombatViewModel {
  status: CombatStatus;
  turn: number;
  player: ActorState;
  companion: ActorState & { definitionId: CompanionId };
  enemies: EnemyState[];
  log: string[];
  animationEvents: AnimationEvent[];
}
