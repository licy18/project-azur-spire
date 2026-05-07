import type { ReactNode, RefObject } from 'react';
import {
  BadgeInfo,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Route,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { cards, commandCompanion, companions, relics } from '../game/core/content';
import { getCardDefinition, getCurrentNode } from '../game/core/engine';
import type { CardDefinition, CombatState, CompanionId, RewardOption, RunState } from '../game/core/types';
import type { Screen } from '../App';

interface VerticalSliceViewProps {
  combat: CombatState | null;
  gameParentRef: RefObject<HTMLDivElement | null>;
  onBeginCombat: (companionId: CompanionId) => void;
  onContinueAfterCombat: () => void;
  onEndTurn: () => void;
  onPlayCard: (cardInstanceId: string) => void;
  onRestartRun: () => void;
  onReward: (reward: RewardOption) => void;
  resultText: string;
  rewards: RewardOption[];
  run: RunState;
  screen: Screen;
}

const assetBase = '/assets/fanwork';

function nextNodeLabel(run: RunState) {
  const node = getCurrentNode(run);
  return node.kind === 'boss' ? `Boss 战：${node.name}` : `普通战斗：${node.name}`;
}

function cardIcon(card: CardDefinition) {
  if (card.type === 'attack') return <Swords size={15} />;
  if (card.type === 'command') return <Sparkles size={15} />;
  return <Shield size={15} />;
}

function enemyIntentText(combat: CombatState | null) {
  const enemy = combat?.enemies.find((candidate) => candidate.hp > 0);
  if (!enemy) return '等待遭遇';
  return `${enemy.name}：${enemy.intent.label} ${enemy.intent.value}`;
}

export function VerticalSliceView(props: VerticalSliceViewProps) {
  const { combat, gameParentRef, run, screen } = props;

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Game stage">
        <header className="top-bar">
          <div>
            <span className="eyebrow">官方合作授权 · 二创占位素材</span>
            <h1>蓝色星原：秘牌回响</h1>
          </div>
          <div className="top-status">
            <span>{window.electronAPI?.platform ?? 'browser'}</span>
            <span>{nextNodeLabel(run)}</span>
          </div>
        </header>

        <div className="battle-layout">
          <div className="battle-column">
            <div ref={gameParentRef} className="game-container" />
            <PlayArea {...props} />
          </div>

          <RightRail combat={combat} run={run} />
        </div>

        {screen !== 'combat' && <OverlayFlow {...props} />}
      </section>
    </main>
  );
}

function RightRail({ combat, run }: { combat: CombatState | null; run: RunState }) {
  const deckCards = run.deck.map((card) => cards[card.cardId]);

  return (
    <aside className="right-rail">
      <section className="rail-panel route-rail">
        <PanelTitle icon={<Route size={16} />} title="旅途路线" value={run.completed ? '完成' : nextNodeLabel(run)} />
        <div className="route-list">
          {run.route.map((node, index) => (
            <div
              key={node.id}
              className={`route-node ${node.cleared ? 'cleared' : ''} ${index === run.currentNodeIndex && !run.completed ? 'current' : ''}`}
            >
              <span>{node.cleared ? <Check size={14} /> : node.kind === 'boss' ? <Trophy size={14} /> : <CircleDot size={14} />}</span>
              <strong>{node.name}</strong>
              <small>{node.kind === 'boss' ? 'Boss' : `0${index + 1}`}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-panel">
        <PanelTitle icon={<BadgeInfo size={16} />} title="敌人意图" value={enemyIntentText(combat)} />
        <div className="rail-stats">
          <StatLine label="忒拉拉生命" value={`${combat?.player.hp ?? run.playerHp}/70`} />
          <StatLine label="伙伴" value={combat?.companion.name ?? companions[run.selectedCompanionId].name} />
          <StatLine label="抽牌/弃牌" value={combat ? `${combat.drawPile.length}/${combat.discardPile.length}` : '-'} />
        </div>
      </section>

      <section className="rail-panel">
        <PanelTitle icon={<Sparkles size={16} />} title="遗物" value={`${run.relics.length} 件`} />
        <div className="relic-list">
          {run.relics.map((id) => (
            <span key={id}>{relics[id]?.name ?? id}</span>
          ))}
        </div>
      </section>

      <section className="rail-panel deck-rail">
        <PanelTitle icon={<BookOpen size={16} />} title="牌组摘要" value={`${run.deck.length} 张`} />
        <div className="mini-deck">
          {deckCards.slice(0, 16).map((card, index) => (
            <span key={`${card.id}-${index}`} className={card.type}>
              {card.name}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function PlayArea(props: VerticalSliceViewProps) {
  const { combat, screen } = props;

  if (screen !== 'combat' || !combat) {
    return <div className="hand-zone idle-hand">选择伙伴后开始本场遭遇。</div>;
  }

  return (
    <section className="hand-zone" aria-label="Hand cards">
      <div className="combat-command-row">
        <div className="energy-orb">
          <Zap size={20} />
          <strong>{combat.energy}</strong>
          <span>/{combat.maxEnergy}</span>
        </div>
        <div className="turn-chip">
          <Clock3 size={15} />
          第 {combat.turn} 回合
        </div>
        <button className="end-turn-button" type="button" onClick={props.onEndTurn} disabled={combat.status !== 'active'}>
          结束回合
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="hand-row">
        {combat.hand.map((cardInstance) => {
          const card = getCardDefinition(cardInstance);
          const disabled =
            combat.status !== 'active' ||
            combat.energy < card.cost ||
            (card.type === 'command' && commandCompanion[card.id] !== combat.companion.definitionId) ||
            (card.type === 'command' && (combat.commandUsedThisTurn || combat.companion.hp <= 0));

          return (
            <button
              key={cardInstance.instanceId}
              className={`hand-card ${card.type}`}
              type="button"
              disabled={disabled}
              onClick={() => props.onPlayCard(cardInstance.instanceId)}
            >
              <span className="card-cost">{card.cost}</span>
              <span className="card-type">{cardIcon(card)} {card.type === 'attack' ? '攻击' : card.type === 'command' ? '指令' : '技能'}</span>
              <strong>{card.name}</strong>
              <small>{card.description}</small>
            </button>
          );
        })}
      </div>

      {combat.status !== 'active' && (
        <div className="combat-result-banner">
          <strong>{combat.status === 'won' ? '战斗胜利' : '战斗失败'}</strong>
          <button type="button" onClick={props.onContinueAfterCombat}>
            继续
          </button>
        </div>
      )}
    </section>
  );
}

function OverlayFlow(props: VerticalSliceViewProps) {
  const { screen } = props;

  return (
    <div className="flow-overlay">
      {screen === 'companion' && <CompanionSelect {...props} />}
      {screen === 'reward' && <RewardSelect {...props} />}
      {screen === 'result' && <ResultPanel {...props} />}
    </div>
  );
}

function CompanionSelect({ onBeginCombat, run }: VerticalSliceViewProps) {
  return (
    <section className="flow-card companion-flow">
      <FlowHeading eyebrow="伙伴选择" title={nextNodeLabel(run)} description="每场战斗前选择一只奇波上场。指令牌只能由当前伙伴响应。" />
      <div className="companion-grid">
        {run.unlockedCompanions.map((id) => {
          const companion = companions[id];
          return (
            <button key={id} className={`companion-card ${id}`} type="button" onClick={() => onBeginCombat(id)}>
              <img src={`${assetBase}/${id}.png`} alt="" />
              <div>
                <strong>{companion.name}</strong>
                <span>{companion.role}</span>
                <small>{companion.passive}</small>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RewardSelect({ onReward, rewards }: VerticalSliceViewProps) {
  return (
    <section className="flow-card reward-flow">
      <FlowHeading eyebrow="战斗奖励" title="选择 1 项加入旅途" description="奖励会立刻加入本次路线，下一场战斗前仍可重新选择伙伴。" />
      <div className="reward-grid">
        {rewards.map((reward) => {
          const card = reward.cardId ? cards[reward.cardId] : undefined;
          return (
            <button key={reward.id} className={`reward-card ${card?.type ?? 'relic'}`} type="button" onClick={() => onReward(reward)}>
              <span className="card-type">{card ? cardIcon(card) : <Sparkles size={15} />} {reward.kind === 'card' ? '卡牌' : '遗物'}</span>
              <strong>{reward.label}</strong>
              <small>{reward.description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ResultPanel({ onRestartRun, resultText, run }: VerticalSliceViewProps) {
  const won = run.completed;

  return (
    <section className="flow-card result-flow">
      <Trophy size={42} />
      <span className="eyebrow">{won ? '旅谣完成' : '探索中断'}</span>
      <h2>{won ? '怯影之翼试炼完成' : '星原仍在等待'}</h2>
      <p>{resultText}</p>
      <button type="button" onClick={onRestartRun}>
        重新开始
      </button>
    </section>
  );
}

function PanelTitle({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="panel-title">
      <span>{icon}{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlowHeading({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return (
    <div className="flow-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
