import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

export function createGame(parent: HTMLElement) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#050816',
    physics: {
      default: 'arcade',
      arcade: {
        debug: import.meta.env.DEV,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BattleScene],
  };

  return new Phaser.Game(config);
}
