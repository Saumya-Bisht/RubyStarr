import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';

const PhaserGame = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameContainerRef.current,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 900 },
            debug: false
          }
        },
        scene: MainScene
      };

      gameRef.current = new Phaser.Game(config);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={gameContainerRef} id="game-container" style={{ width: '100vw', height: '100vh' }} />;
};

export default PhaserGame;
