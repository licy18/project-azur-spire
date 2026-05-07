import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGame } from './game/Game';
import { cards, commandCompanion, companions, relics } from './game/core/content';
import {
  chooseReward,
  createInitialRun,
  endTurn,
  finishCombat,
  getCardDefinition,
  getCurrentNode,
  getRewardOptions,
  playCard,
  selectCompanion,
  startCombat,
  toCombatViewModel,
} from './game/core/engine';
import type { CombatState, CompanionId, RewardOption, RunState } from './game/core/types';
import { BattleScene } from './game/scenes/BattleScene';
import './styles.css';

type Screen = 'companion' | 'combat' | 'reward' | 'result';

function getScene(game: Phaser.Game | null) {
  return game?.scene.getScene('BattleScene') as BattleScene | undefined;
}

function nextNodeLabel(run: RunState) {
  const node = getCurrentNode(run);
  return node.kind === 'boss' ? `Boss 战：${node.name}` : `普通战斗：${node.name}`;
}

export function App() {
  const gameParentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [run, setRun] = useState(() => createInitialRun('project-azur-spire-vertical-slice'));
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [screen, setScreen] = useState<Screen>('companion');
  const [resultText, setResultText] = useState('');

  const currentNode = getCurrentNode(run);
  const rewards = useMemo(() => (screen === 'reward' ? getRewardOptions(run) : []), [run, screen]);

  useEffect(() => {
    if (!gameParentRef.current || gameRef.current) {
      return;
    }

    gameRef.current = createGame(gameParentRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = getScene(gameRef.current);
    scene?.renderCombatView(combat ? toCombatViewModel(combat) : null);
  }, [combat]);

  function beginCombat(companionId: CompanionId) {
    const selectedRun = selectCompanion(run, companionId);
    const nextCombat = startCombat(selectedRun, currentNode.id);
    setRun(selectedRun);
    setCombat(nextCombat);
    setScreen('combat');
  }

  function handlePlayCard(cardInstanceId: string) {
    if (!combat) {
      return;
    }

    const nextCombat = playCard(combat, cardInstanceId, combat.enemies[0]?.id);
    setCombat(nextCombat);
  }

  function handleEndTurn() {
    if (!combat) {
      return;
    }

    setCombat(endTurn(combat));
  }

  function continueAfterCombat() {
    if (!combat) {
      return;
    }

    if (combat.status === 'lost') {
      setResultText('探索失败。忒拉拉暂时撤离星原，准备下一次旅途。');
      setScreen('result');
      return;
    }

    const advancedRun = finishCombat(run, combat);
    setRun(advancedRun);

    if (advancedRun.completed) {
      setResultText('试炼完成。忒拉拉与伙伴们守住了这段旅谣。');
      setScreen('result');
      return;
    }

    setCombat(null);
    setScreen('reward');
  }

  function handleReward(reward: RewardOption) {
    const rewardedRun = chooseReward(run, reward.id);
    setRun(rewardedRun);
    setScreen('companion');
  }

  function restartRun() {
    const nextRun = createInitialRun(`project-azur-spire-${Date.now()}`);
    setRun(nextRun);
    setCombat(null);
    setResultText('');
    setScreen('companion');
  }

  const deckCards = run.deck.map((card) => cards[card.cardId]);

  return (
    <main className="app-shell">
      <section className="game-stage" aria-label="Game stage">
        <div className="game-toolbar">
          <span>蓝色星原：秘牌回响</span>
          <span>{window.electronAPI?.platform ?? 'browser'} · 官方合作授权 · 二创素材</span>
        </div>

        <div className="play-layout">
          <div ref={gameParentRef} className="game-container" />

          <aside className="side-panel">
            <section className="route-panel">
              <div className="panel-heading">
                <span>旅途路线</span>
                <strong>{run.completed ? '完成' : nextNodeLabel(run)}</strong>
              </div>
              <div className="route-list">
                {run.route.map((node, index) => (
                  <div
                    key={node.id}
                    className={`route-node ${node.cleared ? 'cleared' : ''} ${index === run.currentNodeIndex && !run.completed ? 'current' : ''}`}
                  >
                    <span>{node.kind === 'boss' ? 'Boss' : `0${index + 1}`}</span>
                    <strong>{node.name}</strong>
                    <small>{node.cleared ? '已净化' : node.kind === 'boss' ? '终点' : '战斗'}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="run-panel">
              <div className="stat-row">
                <span>忒拉拉生命</span>
                <strong>{run.playerHp}/{70}</strong>
              </div>
              <div className="stat-row">
                <span>牌组</span>
                <strong>{run.deck.length} 张</strong>
              </div>
              <div className="stat-row">
                <span>遗物</span>
                <strong>{run.relics.map((id) => relics[id]?.name).join('、') || '无'}</strong>
              </div>
            </section>
          </aside>

          <section className="control-panel">
            {screen === 'companion' && (
              <div className="companion-select">
                <div className="section-title">
                  <span>选择本场伙伴</span>
                  <strong>{nextNodeLabel(run)}</strong>
                </div>
                <div className="companion-grid">
                  {run.unlockedCompanions.map((id) => {
                    const companion = companions[id];
                    return (
                      <button key={id} className="companion-card" type="button" onClick={() => beginCombat(id)}>
                        <strong>{companion.name}</strong>
                        <span>{companion.role}</span>
                        <small>{companion.passive}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {screen === 'combat' && combat && (
              <div className="combat-hud">
                <div className="combat-topline">
                  <strong>能量 {combat.energy}/{combat.maxEnergy}</strong>
                  <span>抽牌 {combat.drawPile.length} · 弃牌 {combat.discardPile.length}</span>
                  <button type="button" onClick={handleEndTurn} disabled={combat.status !== 'active'}>
                    结束回合
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
                        onClick={() => handlePlayCard(cardInstance.instanceId)}
                      >
                        <span className="card-cost">{card.cost}</span>
                        <strong>{card.name}</strong>
                        <small>{card.description}</small>
                      </button>
                    );
                  })}
                </div>

                {combat.status !== 'active' && (
                  <div className="combat-result">
                    <strong>{combat.status === 'won' ? '战斗胜利' : '战斗失败'}</strong>
                    <button type="button" onClick={continueAfterCombat}>
                      继续
                    </button>
                  </div>
                )}
              </div>
            )}

            {screen === 'reward' && (
              <div className="reward-panel">
                <div className="section-title">
                  <span>战斗奖励</span>
                  <strong>选择 1 项加入旅途</strong>
                </div>
                <div className="reward-grid">
                  {rewards.map((reward) => (
                    <button key={reward.id} className="reward-card" type="button" onClick={() => handleReward(reward)}>
                      <strong>{reward.label}</strong>
                      <span>{reward.kind === 'card' ? '卡牌' : '遗物'}</span>
                      <small>{reward.description}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === 'result' && (
              <div className="result-panel">
                <strong>{resultText}</strong>
                <button type="button" onClick={restartRun}>
                  重新开始
                </button>
              </div>
            )}
          </section>

          <section className="deck-strip" aria-label="Deck list">
            {deckCards.slice(0, 14).map((card, index) => (
              <span key={`${card.id}-${index}`}>{card.name}</span>
            ))}
          </section>

          <section className="source-note">
            命名参考官方中文资料。当前版本仅使用自制/AI 二创占位素材，不接入官方美术素材。
          </section>
        </div>
      </section>
    </main>
  );
}
