import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createGame } from './game/Game';
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
  toCombatViewModel,
} from './game/core/engine';
import type { CombatState, CompanionId, RewardOption, RunState } from './game/core/types';
import { BattleScene } from './game/scenes/BattleScene';
import { VerticalSliceView } from './ui/VerticalSliceView';
import './styles.css';

export type Screen = 'companion' | 'combat' | 'reward' | 'result';

function getScene(game: Phaser.Game | null) {
  const scene = game?.scene.getScene('BattleScene') as BattleScene | undefined;
  return scene ?? (window as typeof window & { __battleScene?: BattleScene }).__battleScene;
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

  function syncCombatToScene(nextCombat: CombatState) {
    const view = toCombatViewModel(nextCombat);
    getScene(gameRef.current)?.renderCombatView(view);
    window.requestAnimationFrame(() => getScene(gameRef.current)?.renderCombatView(view));
    window.setTimeout(() => getScene(gameRef.current)?.renderCombatView(view), 80);
  }

  function clearScene() {
    getScene(gameRef.current)?.renderCombatView(null);
    window.requestAnimationFrame(() => getScene(gameRef.current)?.renderCombatView(null));
    window.setTimeout(() => getScene(gameRef.current)?.renderCombatView(null), 80);
  }

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
    if (!combat) {
      return;
    }

    syncCombatToScene(combat);
  }, [combat]);

  function beginCombat(companionId: CompanionId) {
    const selectedRun = selectCompanion(run, companionId);
    const nextCombat = startCombat(selectedRun, currentNode.id);
    setRun(selectedRun);
    setCombat(nextCombat);
    syncCombatToScene(nextCombat);
    setScreen('combat');
  }

  function handlePlayCard(cardInstanceId: string) {
    if (!combat) {
      return;
    }

    const nextCombat = playCard(combat, cardInstanceId, combat.enemies[0]?.id);
    setCombat(nextCombat);
    syncCombatToScene(nextCombat);
  }

  function handleEndTurn() {
    if (!combat) {
      return;
    }

    const nextCombat = endTurn(combat);
    setCombat(nextCombat);
    syncCombatToScene(nextCombat);
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
    clearScene();
    setScreen('reward');
  }

  function handleReward(reward: RewardOption) {
    setRun(chooseReward(run, reward.id));
    setScreen('companion');
  }

  function restartRun() {
    setRun(createInitialRun(`project-azur-spire-${Date.now()}`));
    setCombat(null);
    clearScene();
    setResultText('');
    setScreen('companion');
  }

  return (
    <VerticalSliceView
      combat={combat}
      gameParentRef={gameParentRef}
      onBeginCombat={beginCombat}
      onContinueAfterCombat={continueAfterCombat}
      onEndTurn={handleEndTurn}
      onPlayCard={handlePlayCard}
      onRestartRun={restartRun}
      onReward={handleReward}
      resultText={resultText}
      rewards={rewards}
      run={run}
      screen={screen}
    />
  );
}
