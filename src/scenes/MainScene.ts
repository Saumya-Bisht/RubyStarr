import * as Phaser from 'phaser';

const WORLD_HEIGHT = 600;
const TOTAL_LEVELS = 15;
const SHERIFF_NAME = 'Sheriff Ruby Starr';
const COMPANION_NAME = 'Moonflash';

type Facing = 'left' | 'right';
type ControlMode = 'keyboard' | 'voice';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface PlatformSpec {
  x: number;
  y: number;
  scaleX: number;
}

interface PointSpec {
  x: number;
  y: number;
}

interface TumbleweedSpec {
  x: number;
  y: number;
  velocityX: number;
}

interface GoonSpec {
  x: number;
  y: number;
  fireRate: number;
  bulletSpeed: number;
  facing: Facing;
}

interface LevelConfig {
  id: number;
  name: string;
  worldWidth: number;
  start: PointSpec;
  horse: PointSpec;
  platforms: PlatformSpec[];
  badges: PointSpec[];
  tumbleweeds: TumbleweedSpec[];
  goons: GoonSpec[];
}

const STAGE_NAMES = [
  'Dusty Boot Trail',
  'Lantern Ridge',
  'Copper Canyon',
  'Outlaw Crossing',
  'Mesa Echo Run',
  'Golden Spur Path',
  'Cactus Crown Climb',
  'Bandit Bluff',
  'Sunset Divide',
  'Hollow Creek Sprint',
  'Prairie Thunder',
  'Starlight Gulch',
  'Moon Ridge Rush',
  'High Noon Pass',
  'Last Frontier Ride'
];

const STAGE_PATTERNS = [
  [560, 520, 470, 420, 380, 340, 300, 560],
  [560, 520, 460, 400, 450, 370, 310, 560],
  [560, 505, 435, 365, 425, 350, 285, 560],
  [560, 520, 455, 385, 320, 390, 315, 250, 560],
  [560, 500, 430, 355, 425, 345, 275, 330, 255, 560],
  [560, 505, 430, 345, 280, 355, 300, 240, 315, 560],
  [560, 520, 445, 365, 300, 380, 310, 250, 330, 265, 560],
  [560, 495, 415, 335, 265, 345, 285, 225, 305, 245, 560],
  [560, 515, 435, 355, 275, 345, 265, 205, 285, 230, 560],
  [560, 490, 405, 325, 255, 335, 255, 195, 275, 225, 305, 560],
  [560, 505, 425, 345, 265, 205, 285, 225, 185, 265, 325, 560],
  [560, 475, 395, 315, 235, 305, 225, 165, 245, 185, 265, 560],
  [560, 500, 415, 325, 245, 185, 265, 205, 155, 225, 305, 560],
  [560, 485, 395, 305, 225, 165, 245, 185, 145, 225, 165, 560],
  [560, 505, 425, 345, 265, 185, 245, 165, 225, 145, 205, 560]
];

const LEVEL_START_COLORS = [
  0xf8c980,
  0xd7f0f9,
  0xdff1b9,
  0xe4d1ff,
  0xffe5b8,
  0xb6e7f1,
  0xf1d8c8,
  0xd8e4b8,
  0xfaddc6,
  0xcbd7ff,
  0xe8f2d4,
  0xffd5d8,
  0xd5e0ff,
  0xe7d2c4,
  0xf1e8cc
];

function buildLevels(): LevelConfig[] {
  return STAGE_PATTERNS.map((pattern, index) => {
    const spacing = 150;
    const startX = 180;
    const platforms = pattern.map((y, platformIndex) => {
      const isEdge = platformIndex === 0 || platformIndex === pattern.length - 1;
      const scaleBase = isEdge ? 1.18 : 0.74 - Math.min(index, 8) * 0.012;

      return {
        x: startX + platformIndex * spacing,
        y,
        scaleX: Phaser.Math.Clamp(scaleBase + (platformIndex % 2 === 0 ? 0.04 : 0), 0.56, 1.2)
      };
    });

    const lastPlatform = platforms[platforms.length - 1];
    const worldWidth = lastPlatform.x + 260;
    const badgeCount = Math.min(4 + Math.floor(index / 3), 7);
    const tumbleweedCount = Math.min(1 + Math.floor(index / 3), 5);
    const goonCount = Math.min(index < 3 ? 0 : 1 + Math.floor((index - 3) / 3), 4);

    const badgeCandidates = platforms
      .slice(1, -1)
      .map((platform, platformIndex) => ({
        x: platform.x,
        y: platform.y - 52,
        order: platformIndex
      }))
      .sort((a, b) => a.order - b.order);

    const badges = badgeCandidates.slice(0, badgeCount).map(({ x, y }) => ({ x, y }));

    const tumbleweedPlatforms = platforms.filter(
      (_, platformIndex) => platformIndex > 1 && platformIndex < platforms.length - 1
    );
    const tumbleweeds = Array.from({ length: tumbleweedCount }, (_, tumbleweedIndex) => {
      const platform = tumbleweedPlatforms[tumbleweedIndex % tumbleweedPlatforms.length];

      return {
        x: platform.x,
        y: platform.y - 24,
        velocityX: tumbleweedIndex % 2 === 0 ? 100 + index * 8 : -100 - index * 8
      };
    });

    const badgeXs = new Set(badges.map((badge) => badge.x));
    const goonPlatforms = platforms.filter(
      (platform, platformIndex) =>
        platformIndex > 1 &&
        platformIndex < platforms.length - 1 &&
        platform.y <= 430 &&
        !badgeXs.has(platform.x)
    );

    const fallbackPlatforms = platforms.filter(
      (platform, platformIndex) =>
        platformIndex > 1 &&
        platformIndex < platforms.length - 1 &&
        platform.y <= 430
    );

    const goons = Array.from({ length: goonCount }, (_, goonIndex) => {
      const platform = goonPlatforms.length > 0
        ? goonPlatforms[goonIndex % goonPlatforms.length]
        : fallbackPlatforms[goonIndex % fallbackPlatforms.length];

      return {
        x: platform.x,
        y: platform.y - 48,
        fireRate: Math.max(1500 - index * 70 - goonIndex * 80, 650),
        bulletSpeed: 220 + index * 18,
        facing: (goonIndex % 2 === 0 ? 'left' : 'right') as Facing
      };
    });

    return {
      id: index + 1,
      name: STAGE_NAMES[index],
      worldWidth,
      start: { x: 90, y: 500 },
      horse: { x: lastPlatform.x + 38, y: lastPlatform.y - 52 },
      platforms,
      badges,
      tumbleweeds,
      goons
    };
  });
}

const LEVELS = buildLevels();

export class MainScene extends Phaser.Scene {
  private currentLevel = 0;
  private controlMode: ControlMode | null = null;
  private levelConfig!: LevelConfig;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private badges!: Phaser.Physics.Arcade.Group;
  private tumbleweeds!: Phaser.Physics.Arcade.Group;
  private goons!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private horse!: Phaser.Types.Physics.Arcade.ImageWithStaticBody;
  private horseRider!: Phaser.GameObjects.Container;
  private horseLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private voiceStatusText!: Phaser.GameObjects.Text;
  private voiceStatusContainer!: Phaser.GameObjects.Container;
  private protectionStatusText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private collectedBadges = 0;
  private gameOver = false;
  private isRidingAway = false;
  private gameStarted = false;
  private isProtected = false;
  private protectionBubble: Phaser.GameObjects.Arc | null = null;
  private protectionCooldown = false;
  private controlOverlay: Phaser.GameObjects.Container | null = null;
  private voiceRecognition: SpeechRecognitionLike | null = null;
  private voiceDirection: -1 | 0 | 1 = 0;
  private voiceJumpQueued = false;
  // private voiceMoveUntil = 0;
  private voiceRestartPending = false;
  private shootEvents: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super('MainScene');
  }

  init(data: { level?: number; controlMode?: ControlMode | null }) {
    this.currentLevel = Phaser.Math.Clamp(data?.level ?? 0, 0, TOTAL_LEVELS - 1);
    this.controlMode = data?.controlMode ?? this.controlMode ?? null;
  }

  preload() {
    this.createPlaceholders();
  }

  create() {
    this.levelConfig = LEVELS[this.currentLevel];
    this.collectedBadges = 0;
    this.gameOver = false;
    this.isRidingAway = false;
    this.gameStarted = false;
    this.isProtected = false;
    this.protectionCooldown = false;
    this.voiceDirection = 0;
    this.voiceJumpQueued = false;
    // this.voiceMoveUntil = 0;
    this.voiceRestartPending = false;
    this.stopVoiceRecognition();
    this.shootEvents.forEach((event) => event.remove(false));
    this.shootEvents = [];
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.physics.resume();

    this.physics.world.setBounds(0, 0, this.levelConfig.worldWidth, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.levelConfig.worldWidth, WORLD_HEIGHT);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor(LEVEL_START_COLORS[this.currentLevel]);

    this.createBackdrop();
    this.createStartDecorations();
    this.createPlatforms();
    this.createPlayer();
    this.createControls();
    this.createBadges();
    this.createHazards();
    this.createGoons();
    this.createGoal();
    this.createHud();
    this.setupPhysics();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopVoiceRecognition();
    });

    this.showControlOverlay();
  }

  update() {
    if (!this.gameStarted || this.gameOver || this.isRidingAway) {
      return;
    }

    const left =
      this.controlMode === 'voice'
        ? this.voiceDirection < 0
        : this.cursors.left.isDown || this.wasdKeys.A.isDown;
    const right =
      this.controlMode === 'voice'
        ? this.voiceDirection > 0
        : this.cursors.right.isDown || this.wasdKeys.D.isDown;
    const jump =
      this.controlMode === 'voice'
        ? this.voiceJumpQueued
        : this.cursors.up.isDown || this.wasdKeys.W.isDown || this.cursors.space.isDown;

    if (left) {
      this.player.setVelocityX(-220);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(220);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(-480);
      this.voiceJumpQueued = false;
    }

    if (this.isProtected && this.protectionBubble) {
      this.protectionBubble.setPosition(this.player.x, this.player.y);
    }

    this.cleanupBullets();

    if (this.player.y > WORLD_HEIGHT + 40) {
      this.failRun('Ruby dropped into the canyon.');
    }
  }

  private createBackdrop() {
    const width = this.levelConfig.worldWidth;

    this.add.rectangle(width / 2, 110, width, 220, 0x6fc5f9);
    this.add.rectangle(width / 2, 260, width, 160, 0xf6b56e);
    this.add.rectangle(width / 2, 430, width, 260, 0xe29f5a);
    this.add.rectangle(width / 2, 570, width, 60, 0x6b3d1d);

    this.add.circle(width - 220, 92, 46, 0xffefaf, 0.92);
    this.add.circle(width - 220, 92, 78, 0xffefaf, 0.18);

    const mesaGap = 360;
    for (let x = 180; x < width; x += mesaGap) {
      const mesaWidth = 250 + (x % 3) * 50;
      this.add.rectangle(x, 318, mesaWidth, 120, 0xcd7242).setOrigin(0.5, 1);
      this.add.rectangle(x, 270, mesaWidth * 0.58, 45, 0xa75633).setOrigin(0.5, 1);
    }

    for (let i = 0; i < 5; i += 1) {
      const cloudX = 160 + i * 340;
      this.add.ellipse(cloudX, 88, 110, 42, 0xfff7df, 0.84);
      this.add.ellipse(cloudX - 28, 95, 78, 30, 0xfff7df, 0.78);
      this.add.ellipse(cloudX + 34, 84, 90, 34, 0xfff7df, 0.8);
    }

    for (let x = 100; x < width; x += 260) {
      const cactusKey = x % 520 === 0 ? 'cactusTall' : 'cactusSmall';
      this.add.image(x, 530 - (x % 3) * 16, cactusKey).setDepth(1);
    }

    for (let x = 220; x < width; x += 420) {
      this.add.image(x, 536, 'barrel').setDepth(1);
    }

    this.add.image(250, 470, 'saloonSign').setDepth(1);
    this.add.image(width - 310, 455, 'starLantern').setDepth(1);
  }

  private createStartDecorations() {
    const { x, y } = this.levelConfig.start;
    const theme = this.currentLevel % 5;
    const signX = x + 52;
    const signY = y + 48;

    this.add.rectangle(signX, signY, 10, 44, 0x5f3115).setOrigin(0.5, 1).setDepth(3);
    this.add
      .rectangle(signX, signY - 32, 92, 28, 0xf9edc7)
      .setStrokeStyle(3, 0x8a2e63)
      .setOrigin(0.5, 0.5)
      .setDepth(3);
    this.add
      .text(signX, signY - 32, `Start: ${this.levelConfig.name}`, {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#4b230d',
        align: 'center',
        wordWrap: { width: 84 }
      })
      .setOrigin(0.5, 0.5)
      .setDepth(4);

    if (theme === 0) {
      this.add.rectangle(signX - 44, signY - 10, 18, 28, 0x2b8a57).setOrigin(0.5, 1).setDepth(3);
      this.add.rectangle(signX - 44, signY - 25, 28, 18, 0x2b8a57).setOrigin(0.5, 1).setDepth(3);
    } else if (theme === 1) {
      this.add.circle(signX - 44, signY - 12, 12, 0xffde59).setDepth(3);
      this.add.rectangle(signX - 44, signY - 12, 4, 28, 0x543210).setOrigin(0.5, 0.5).setDepth(3);
    } else if (theme === 2) {
      this.add.ellipse(signX - 36, signY - 10, 36, 20, 0x6d6d6d).setDepth(3);
      this.add.ellipse(signX - 18, signY - 12, 26, 14, 0x7e7e7e).setDepth(3);
    } else if (theme === 3) {
      this.add.rectangle(signX - 44, signY - 6, 10, 24, 0x8e5e3b).setOrigin(0.5, 1).setDepth(3);
      this.add.triangle(signX - 44, signY - 20, signX - 54, signY - 10, signX - 34, signY - 10, 0xa54433).setDepth(3);
    } else {
      this.add.circle(signX - 44, signY - 12, 10, 0x6d9f4a).setDepth(3);
      this.add.rectangle(signX - 44, signY - 6, 18, 12, 0x6d9f4a).setOrigin(0.5, 1).setDepth(3);
      this.add.rectangle(signX - 44, signY - 20, 8, 12, 0xd7be8f).setOrigin(0.5, 1).setDepth(3);
    }
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    this.levelConfig.platforms.forEach(({ x, y, scaleX }) => {
      this.platforms.create(x, y, 'platform').setScale(scaleX, 1).refreshBody().setDepth(2);
    });
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(this.levelConfig.start.x, this.levelConfig.start.y, 'sheriff');
    this.player.setBounce(0.05);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(28, 46);
    this.player.setOffset(2, 2);
    this.player.setDepth(6);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private createControls() {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    this.input.keyboard.on('keydown-K', () => {
      if (!this.gameStarted) {
        this.selectControlMode('keyboard');
      }
    });
    this.input.keyboard.on('keydown-V', () => {
      if (!this.gameStarted) {
        this.selectControlMode('voice');
      }
    });
    this.input.keyboard.on('keydown-B', () => {
      this.activateProtection();
    });
  }

  private activateProtection() {
    if (this.isProtected || this.protectionCooldown || !this.gameStarted || this.gameOver) {
      return;
    }

    this.isProtected = true;
    this.protectionCooldown = true;
    this.protectionStatusText.setText('Protection: ACTIVE (4s)');
    this.protectionStatusText.setColor('#00ff00');

    // Create bubble
    this.protectionBubble = this.add.circle(this.player.x, this.player.y, 40, 0x6fc5f9, 0.4);
    this.protectionBubble.setStrokeStyle(3, 0xffffff, 0.8);
    this.protectionBubble.setDepth(10);

    // Pulse effect
    this.tweens.add({
      targets: this.protectionBubble,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Deactivate after 4 seconds
    this.time.delayedCall(4000, () => {
      this.isProtected = false;
      this.protectionStatusText.setText('Protection: COOLDOWN');
      this.protectionStatusText.setColor('#ff0000');
      
      if (this.protectionBubble) {
        this.tweens.add({
          targets: this.protectionBubble,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (this.protectionBubble) {
              this.protectionBubble.destroy();
              this.protectionBubble = null;
            }
          }
        });
      }

      // Cooldown for 10 seconds (total)
      this.time.delayedCall(6000, () => {
        this.protectionCooldown = false;
        this.protectionStatusText.setText('Protection: READY (Press B)');
        this.protectionStatusText.setColor('#fff2c5');
      });
    });
  }

  private createBadges() {
    this.badges = this.physics.add.group({
      key: 'badge',
      allowGravity: false,
      immovable: true
    });

    this.levelConfig.badges.forEach(({ x, y }, index) => {
      const badge = this.badges.create(x, y, 'badge') as Phaser.Physics.Arcade.Sprite;
      badge.setDepth(5);

      this.tweens.add({
        targets: badge,
        y: y - 10,
        duration: 850 + index * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.tweens.add({
        targets: badge,
        angle: 10,
        duration: 700 + index * 60,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private createHazards() {
    this.tumbleweeds = this.physics.add.group({
      collideWorldBounds: true,
      bounceX: 1,
      bounceY: 0
    });

    this.levelConfig.tumbleweeds.forEach(({ x, y, velocityX }) => {
      const tumbleweed = this.tumbleweeds.create(x, y, 'tumbleweed') as Phaser.Physics.Arcade.Sprite;
      tumbleweed.setCircle(16, 0, 0);
      tumbleweed.setVelocityX(velocityX);
      tumbleweed.setAngularVelocity(velocityX > 0 ? 180 : -180);
      tumbleweed.setBounce(1, 0);
      tumbleweed.setDepth(5);
    });
  }

  private createGoons() {
    this.goons = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.bullets = this.physics.add.group({
      allowGravity: false
    });

    this.levelConfig.goons.forEach(({ x, y, fireRate, bulletSpeed, facing }) => {
      const goon = this.goons.create(x, y, 'goon') as Phaser.Physics.Arcade.Sprite;
      goon.setDepth(6);
      goon.setFlipX(facing === 'left');
      goon.setSize(28, 46);
      goon.setOffset(2, 2);
      goon.setImmovable(true);
      (goon.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      goon.setData('bulletSpeed', bulletSpeed);

      const fireEvent = this.time.addEvent({
        delay: fireRate,
        loop: true,
        callback: () => {
          this.fireBullet(goon);
        }
      });

      this.shootEvents.push(fireEvent);
    });
  }

  private createGoal() {
    this.horse = this.physics.add.staticImage(this.levelConfig.horse.x, this.levelConfig.horse.y, 'horse');
    this.horse.setDepth(6);

    this.horseLabel = this.add
      .text(this.levelConfig.horse.x, this.levelConfig.horse.y - 350, `${COMPANION_NAME} is waiting`, {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#4b230d',
        fontStyle: 'bold',
        backgroundColor: '#f9edc7',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(0.5, 1)
      .setDepth(7);

    this.horseRider = this.add.container(this.levelConfig.horse.x, this.levelConfig.horse.y).setVisible(false).setDepth(8);
    const mountHorse = this.add.image(0, 0, 'horseRide').setOrigin(0.5, 0.95);
    const rider = this.add.image(-2, -27, 'sheriffRide').setOrigin(0.5, 1);
    this.horseRider.add([mountHorse, rider]);
  }

  private createHud() {
    this.add
      .rectangle(20, 10, 380, 70, 0x5f3115, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0xf0ca7a)
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(44, 20, `${SHERIFF_NAME}\n${this.levelConfig.name}`, {
        fontFamily: 'Georgia',
        fontSize: '20px',
        color: '#fff8df',
        align: 'left',
        fontStyle: 'bold'
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.add
      .text(24, 85, `Stage ${this.currentLevel + 1}/${TOTAL_LEVELS}`, {
        fontFamily: 'Georgia',
        fontSize: '22px',
        color: '#fff2c5',
        fontStyle: 'bold',
        backgroundColor: '#7b431f',
        padding: { x: 12, y: 8 }
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.statusText = this.add
      .text(24, 130, `Badges: 0/${this.levelConfig.badges.length}`, {
        fontFamily: 'Georgia',
        fontSize: '22px',
        color: '#fff2c5',
        fontStyle: 'bold',
        backgroundColor: '#7b431f',
        padding: { x: 12, y: 8 }
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.protectionStatusText = this.add
      .text(24, 175, `Protection: READY (Press B)`, {
        fontFamily: 'Georgia',
        fontSize: '22px',
        color: '#fff2c5',
        fontStyle: 'bold',
        backgroundColor: '#7b431f',
        padding: { x: 12, y: 8 }
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.goalText = this.add
      .text(24, 220, `Collect every star badge, avoid bandits, then reach ${COMPANION_NAME}.`, {
        fontFamily: 'Georgia',
        fontSize: '19px',
        color: '#4a2a12',
        backgroundColor: '#f9edc7',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 440 }
      })
      .setScrollFactor(0)
      .setDepth(21);

    this.voiceStatusText = this.add.text(12, 10, 'Control mode: not selected', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: '#fff6dd'
    });

    const voiceStatusBg = this.add.rectangle(0, 0, 520, 44, 0x5f3115, 1).setOrigin(0, 0);
    this.voiceStatusContainer = this.add
      .container(24, 280, [voiceStatusBg, this.voiceStatusText])
      .setScrollFactor(0)
      .setDepth(21)
      .setVisible(false);
  }

  private setupPhysics() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.tumbleweeds, this.platforms);
    this.physics.add.collider(this.bullets, this.platforms, (_bullet) => {
      (_bullet as Phaser.Physics.Arcade.Sprite).destroy();
    });
    this.physics.add.collider(this.tumbleweeds, this.tumbleweeds);
    this.physics.add.overlap(this.player, this.badges, this.collectBadge, undefined, this);
    this.physics.add.overlap(this.player, this.tumbleweeds, () => {
      if (!this.isProtected) {
        this.failRun('A tumbleweed wiped Ruby out.');
      }
    });
    this.physics.add.overlap(this.player, this.goons, () => {
      if (!this.isProtected) {
        this.failRun('A bandit grabbed Ruby.');
      }
    });
    this.physics.add.overlap(this.player, this.bullets, (_player, bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      if (this.isProtected) {
        b.destroy();
      } else {
        b.destroy();
        this.failRun('Ruby was hit by bandit fire.');
      }
    });
    this.physics.add.overlap(this.player, this.horse, this.tryReachHorse, undefined, this);
  }

  private fireBullet(goon: Phaser.Physics.Arcade.Sprite) {
    if (this.gameOver || this.isRidingAway || !goon.active) {
      return;
    }

    const speed = goon.getData('bulletSpeed') as number;
    const direction = this.player.x >= goon.x ? 1 : -1;
    goon.setFlipX(direction < 0);

    const bullet = this.bullets.create(goon.x + direction * 24, goon.y - 4, 'bullet') as Phaser.Physics.Arcade.Sprite;
    bullet.setDepth(6);
    (bullet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    bullet.setVelocityX(direction * speed);
    bullet.setVelocityY(Phaser.Math.Clamp((this.player.y - goon.y) * 0.4, -70, 70));
  }

  private cleanupBullets() {
    this.bullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (!bullet.active) {
        return;
      }

      if (
        bullet.x < -80 ||
        bullet.x > this.levelConfig.worldWidth + 80 ||
        bullet.y < -80 ||
        bullet.y > WORLD_HEIGHT + 80
      ) {
        bullet.destroy();
      }
    });
  }

  private collectBadge(_player: unknown, badge: unknown) {
    const collectible = badge as Phaser.Physics.Arcade.Sprite;
    collectible.disableBody(true, true);
    this.collectedBadges += 1;
    this.statusText.setText(`Badges: ${this.collectedBadges}/${this.levelConfig.badges.length}`);
    this.cameras.main.shake(90, 0.002);

    if (this.collectedBadges === this.levelConfig.badges.length) {
      this.goalText.setText(`All badges found. Reach ${COMPANION_NAME}!`);
      this.tweens.add({
        targets: this.horseLabel,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 450,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private tryReachHorse() {
    if (this.collectedBadges < this.levelConfig.badges.length) {
      const remaining = this.levelConfig.badges.length - this.collectedBadges;
      this.goalText.setText(`${COMPANION_NAME} waits. ${remaining} badge${remaining === 1 ? '' : 's'} left.`);
      return;
    }

    if (this.isRidingAway) {
      return;
    }

    this.startRideAwaySequence();
  }

  private startRideAwaySequence() {
    this.gameOver = true;
    this.isRidingAway = true;
    this.stopVoiceRecognition();
    this.physics.pause();
    this.player.setVisible(false);
    this.horse.setVisible(false);
    this.horseLabel.setVisible(false);
    this.goons.setVisible(false);
    this.bullets.clear(true, true);
    this.shootEvents.forEach((event) => event.remove(false));
    this.shootEvents = [];

    this.horseRider.setVisible(true);
    this.horseRider.setPosition(this.levelConfig.horse.x, this.levelConfig.horse.y);
    this.goalText.setText(`${SHERIFF_NAME} and ${COMPANION_NAME} are riding to the next town...`);

    this.tweens.add({
      targets: this.horseRider,
      y: this.levelConfig.horse.y - 12,
      duration: 220,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(320, () => {
      this.tweens.add({
        targets: this.horseRider,
        x: this.levelConfig.worldWidth + 220,
        y: this.levelConfig.horse.y - 32,
        scaleX: 0.84,
        scaleY: 0.84,
        duration: 2600,
        ease: 'Sine.easeIn'
      });

      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.08,
        duration: 2200,
        ease: 'Sine.easeInOut'
      });

      this.time.delayedCall(2800, () => {
        if (this.currentLevel < TOTAL_LEVELS - 1) {
          this.add
            .text(this.cameras.main.centerX, this.cameras.main.centerY, `Stage ${this.currentLevel + 1} Clear\nNext: ${LEVELS[this.currentLevel + 1].name}`, {
              fontFamily: 'Georgia',
              fontSize: '34px',
              color: '#fff6d8',
              align: 'center',
              backgroundColor: '#5b3115',
              padding: { x: 22, y: 14 }
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(30);

          this.time.delayedCall(900, () => {
            this.scene.restart({ level: this.currentLevel + 1, controlMode: this.controlMode });
          });

          return;
        }

        this.add
          .text(this.cameras.main.centerX, this.cameras.main.centerY, `YOU MADE IT!\n${SHERIFF_NAME} cleared all ${TOTAL_LEVELS} stages with ${COMPANION_NAME}.`, {
            fontFamily: 'Georgia',
            fontSize: '34px',
            color: '#fff6d8',
            align: 'center',
            backgroundColor: '#5b3115',
            padding: { x: 22, y: 14 }
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(30);

        this.goalText.setText('Campaign complete.');
      });
    });
  }

  private failRun(message: string) {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.stopVoiceRecognition();
    this.physics.pause();
    this.player.setTint(0xd9534f);

    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, `${message}\nRestarting stage...`, {
        fontFamily: 'Georgia',
        fontSize: '34px',
        color: '#fff8dd',
        align: 'center',
        backgroundColor: '#6a1f1f',
        padding: { x: 22, y: 14 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);

    this.time.delayedCall(1300, () => {
      this.scene.restart({ level: this.currentLevel, controlMode: this.controlMode });
    });
  }

  private showControlOverlay() {
    this.physics.pause();
    this.player.setVelocity(0, 0);

    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(60);
    const curtain = this.add.rectangle(400, 300, 800, 600, 0x1f1209, 0.7);
    const panel = this.add
      .rectangle(400, 300, 520, 320, 0x5f3115, 0.96)
      .setStrokeStyle(4, 0xf0ca7a);
    const title = this.add.text(400, 180, 'Choose Your Controls', {
      fontFamily: 'Georgia',
      fontSize: '34px',
      color: '#fff5dc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const keyboardButton = this.createControlButton(270, 320, 'Keyboard', 'Arrows / WASD / Space');
    const voiceButton = this.createControlButton(530, 320, 'Voice (BETA)', 'Say jump, move, aage, ruk');
    keyboardButton.button.on('pointerdown', () => this.selectControlMode('keyboard'));
    voiceButton.button.on('pointerdown', () => this.selectControlMode('voice'));

    const footer = this.add.text(
      400,
      420,
      this.isSpeechRecognitionSupported()
        ? 'Tip: press K for Keyboard or V for Voice'
        : 'Voice works best in Chrome. Keyboard is available now.',
      {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#fff0d0',
        align: 'center'
      }
    ).setOrigin(0.5);

    overlay.add([
      curtain,
      panel,
      title,
      keyboardButton.button,
      keyboardButton.label,
      keyboardButton.hint,
      voiceButton.button,
      voiceButton.label,
      voiceButton.hint,
      footer
    ]);

    this.controlOverlay = overlay;

    if (this.controlMode) {
      this.selectControlMode(this.controlMode);
    }
  }

  private createControlButton(x: number, y: number, label: string, hint: string) {
    const button = this.add
      .rectangle(x, y, 200, 86, 0xf9edc7, 1)
      .setStrokeStyle(3, 0x8a2e63)
      .setInteractive({ useHandCursor: true });
    const title = this.add.text(x, y - 12, label, {
      fontFamily: 'Georgia',
      fontSize: '28px',
      color: '#5a2d12',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    const hintText = this.add.text(x, y + 18, hint, {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#7a4b28',
      align: 'center'
    }).setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0xfff6df, 1));
    button.on('pointerout', () => button.setFillStyle(0xf9edc7, 1));

    return { button, label: title, hint: hintText };
  }

  private selectControlMode(mode: ControlMode) {
    if (mode === 'voice' && !this.isSpeechRecognitionSupported()) {
      this.controlMode = 'keyboard';
      this.finishControlSelection();
      return;
    }

    this.controlMode = mode;
    this.finishControlSelection();
  }

  private finishControlSelection() {
    if (this.controlOverlay) {
      this.controlOverlay.destroy(true);
      this.controlOverlay = null;
    }

    this.gameStarted = true;
    this.physics.resume();

    if (this.controlMode === 'voice') {
      this.voiceStatusText.setText('Control mode: voice. Say jump, stop, aage chalo, peeche.');
      this.voiceStatusContainer.setVisible(true);
      this.startVoiceRecognition();
    } else {
      this.voiceStatusContainer.setVisible(false);
      this.stopVoiceRecognition();
    }
  }

  private isSpeechRecognitionSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private startVoiceRecognition() {
    if (!this.isSpeechRecognitionSupported() || this.voiceRecognition) {
      return;
    }

    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) {
          this.handleVoiceCommand(result[0].transcript);
        }
      }
    };

    recognition.onerror = () => {
      this.voiceStatusText.setText('Voice mode had trouble hearing. Continue or switch to keyboard.');
    };

    recognition.onend = () => {
      this.voiceRecognition = null;
      if (
        this.controlMode === 'voice' &&
        this.gameStarted &&
        !this.gameOver &&
        !this.isRidingAway &&
        !this.voiceRestartPending
      ) {
        this.voiceRestartPending = true;
        this.time.delayedCall(250, () => {
          this.voiceRestartPending = false;
          this.startVoiceRecognition();
        });
      }
    };

    this.voiceRecognition = recognition;
    recognition.start();
  }

  private stopVoiceRecognition() {
    this.voiceDirection = 0;
    this.voiceJumpQueued = false;
    // this.voiceMoveUntil = 0;
    this.voiceRestartPending = false;

    if (this.voiceRecognition) {
      const activeRecognition = this.voiceRecognition;
      this.voiceRecognition = null;
      activeRecognition.onend = null;
      activeRecognition.stop();
    }
  }

  private handleVoiceCommand(rawTranscript: string) {
    const transcript = rawTranscript.toLowerCase().trim();
    this.voiceStatusText.setText(`Voice heard: ${transcript}`);
    const words = transcript.split(' ');

    for (let word of words) {
      if (word.startsWith('ju') || word.startsWith('ho') || word.startsWith('ku') || word.startsWith('up')) {
        this.voiceJumpQueued = true;
        return;
      }

      if (word.startsWith('go') || word.startsWith('ru') || word.startsWith('aa') || word.startsWith('ch')) {
        this.voiceDirection = 1;
        return;
      }

      if (word.startsWith('ba') || word.startsWith('le') || word.startsWith('pee')) {
        this.voiceDirection = -1;
        return;
      }

      if (word.startsWith('st') || word.startsWith('ru')) {
        this.voiceDirection = 0;
        return;
      }
    }
  }

  private createPlaceholders() {
    [
      'platform',
      'sheriff',
      'sheriffRide',
      'badge',
      'tumbleweed',
      'horse',
      'horseRide',
      'cactusTall',
      'cactusSmall',
      'barrel',
      'saloonSign',
      'starLantern',
      'goon',
      'bullet'
    ].forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
    });

    const platformGraphics = this.make.graphics({ x: 0, y: 0 });
    platformGraphics.fillStyle(0x8d5a2f, 1);
    platformGraphics.fillRoundedRect(0, 0, 160, 30, 8);
    platformGraphics.fillStyle(0xf0bf70, 1);
    platformGraphics.fillRoundedRect(0, 0, 160, 9, 6);
    platformGraphics.fillStyle(0x5f3115, 1);
    platformGraphics.fillRect(16, 13, 10, 17);
    platformGraphics.fillRect(64, 13, 10, 17);
    platformGraphics.fillRect(112, 13, 10, 17);
    platformGraphics.generateTexture('platform', 160, 30);
    platformGraphics.destroy();

    const sheriffGraphics = this.make.graphics({ x: 0, y: 0 });
    sheriffGraphics.fillStyle(0x8a552c, 1);
    sheriffGraphics.fillRect(6, 0, 20, 8);
    sheriffGraphics.fillStyle(0xe1bc7b, 1);
    sheriffGraphics.fillRect(2, 8, 28, 4);
    sheriffGraphics.fillStyle(0x4a1f13, 1);
    sheriffGraphics.fillCircle(8, 17, 5);
    sheriffGraphics.fillCircle(24, 17, 5);
    sheriffGraphics.fillCircle(7, 24, 4);
    sheriffGraphics.fillCircle(25, 24, 4);
    sheriffGraphics.fillCircle(9, 30, 4);
    sheriffGraphics.fillCircle(23, 30, 4);
    sheriffGraphics.fillRect(6, 14, 4, 14);
    sheriffGraphics.fillRect(22, 14, 4, 14);
    sheriffGraphics.fillStyle(0xf4d6bb, 1);
    sheriffGraphics.fillRoundedRect(9, 12, 14, 12, 4);
    sheriffGraphics.fillStyle(0x6f4324, 1);
    sheriffGraphics.fillRect(10, 14, 3, 2);
    sheriffGraphics.fillRect(19, 14, 3, 2);
    sheriffGraphics.fillStyle(0x8a2e63, 1);
    sheriffGraphics.fillRoundedRect(6, 24, 20, 14, 4);
    sheriffGraphics.fillStyle(0x5a361d, 1);
    sheriffGraphics.fillRect(8, 38, 6, 10);
    sheriffGraphics.fillRect(18, 38, 6, 10);
    sheriffGraphics.fillStyle(0xf28ab2, 1);
    sheriffGraphics.fillRect(24, 24, 5, 14);
    sheriffGraphics.fillStyle(0xf4d15d, 1);
    sheriffGraphics.fillCircle(21, 30, 3.5);
    sheriffGraphics.fillStyle(0x2d1b13, 1);
    sheriffGraphics.fillRect(8, 10, 16, 2);
    sheriffGraphics.generateTexture('sheriff', 32, 48);
    sheriffGraphics.destroy();

    const sheriffRideGraphics = this.make.graphics({ x: 0, y: 0 });
    sheriffRideGraphics.fillStyle(0x8a552c, 1);
    sheriffRideGraphics.fillRect(10, 0, 20, 8);
    sheriffRideGraphics.fillStyle(0xe1bc7b, 1);
    sheriffRideGraphics.fillRect(6, 8, 28, 4);
    sheriffRideGraphics.fillStyle(0x4a1f13, 1);
    sheriffRideGraphics.fillCircle(10, 18, 5);
    sheriffRideGraphics.fillCircle(28, 18, 5);
    sheriffRideGraphics.fillCircle(9, 25, 4);
    sheriffRideGraphics.fillCircle(29, 25, 4);
    sheriffRideGraphics.fillRect(8, 15, 4, 12);
    sheriffRideGraphics.fillRect(27, 15, 4, 12);
    sheriffRideGraphics.fillStyle(0xf4d6bb, 1);
    sheriffRideGraphics.fillRoundedRect(13, 12, 14, 12, 4);
    sheriffRideGraphics.fillStyle(0x8a2e63, 1);
    sheriffRideGraphics.fillRoundedRect(9, 24, 22, 14, 4);
    sheriffRideGraphics.fillStyle(0xf28ab2, 1);
    sheriffRideGraphics.fillRect(28, 24, 5, 14);
    sheriffRideGraphics.fillStyle(0x7b4b21, 1);
    sheriffRideGraphics.fillRect(8, 26, 10, 5);
    sheriffRideGraphics.fillRect(18, 37, 8, 8);
    sheriffRideGraphics.generateTexture('sheriffRide', 40, 46);
    sheriffRideGraphics.destroy();

    const badgeGraphics = this.make.graphics({ x: 0, y: 0 });
    badgeGraphics.fillStyle(0xffe17e, 1);
    badgeGraphics.fillCircle(14, 14, 14);
    badgeGraphics.fillStyle(0xf2bc2f, 1);
    badgeGraphics.beginPath();
    badgeGraphics.moveTo(14, 2);
    badgeGraphics.lineTo(18, 10);
    badgeGraphics.lineTo(27, 11);
    badgeGraphics.lineTo(20, 17);
    badgeGraphics.lineTo(22, 26);
    badgeGraphics.lineTo(14, 21);
    badgeGraphics.lineTo(6, 26);
    badgeGraphics.lineTo(8, 17);
    badgeGraphics.lineTo(1, 11);
    badgeGraphics.lineTo(10, 10);
    badgeGraphics.closePath();
    badgeGraphics.fillPath();
    badgeGraphics.lineStyle(2, 0x8b5a11, 1);
    badgeGraphics.strokeCircle(14, 14, 13);
    badgeGraphics.generateTexture('badge', 28, 28);
    badgeGraphics.destroy();

    const tumbleweedGraphics = this.make.graphics({ x: 0, y: 0 });
    tumbleweedGraphics.lineStyle(4, 0x8d6133, 1);
    tumbleweedGraphics.strokeCircle(16, 16, 13);
    tumbleweedGraphics.beginPath();
    tumbleweedGraphics.moveTo(5, 11);
    tumbleweedGraphics.lineTo(27, 21);
    tumbleweedGraphics.moveTo(7, 22);
    tumbleweedGraphics.lineTo(24, 7);
    tumbleweedGraphics.moveTo(15, 3);
    tumbleweedGraphics.lineTo(16, 28);
    tumbleweedGraphics.strokePath();
    tumbleweedGraphics.generateTexture('tumbleweed', 32, 32);
    tumbleweedGraphics.destroy();

    const horseGraphics = this.make.graphics({ x: 0, y: 0 });
    horseGraphics.fillStyle(0xf6f0ff, 1);
    horseGraphics.fillRoundedRect(6, 20, 60, 24, 8);
    horseGraphics.fillRoundedRect(47, 8, 17, 18, 5);
    horseGraphics.fillTriangle(54, 8, 60, 0, 62, 9);
    horseGraphics.fillStyle(0xfbc2eb, 1);
    horseGraphics.fillRect(51, 4, 6, 11);
    horseGraphics.fillStyle(0xe4dcff, 1);
    horseGraphics.fillRect(14, 42, 6, 18);
    horseGraphics.fillRect(28, 42, 6, 18);
    horseGraphics.fillRect(44, 42, 6, 18);
    horseGraphics.fillRect(56, 42, 6, 18);
    horseGraphics.fillStyle(0xcaa16c, 1);
    horseGraphics.fillRect(28, 26, 12, 6);
    horseGraphics.fillStyle(0xf2b3ff, 1);
    horseGraphics.fillTriangle(63, 8, 68, -5, 72, 10);
    horseGraphics.fillStyle(0x7fd8ff, 1);
    horseGraphics.fillCircle(58, 16, 2);
    horseGraphics.generateTexture('horse', 72, 60);
    horseGraphics.destroy();

    const horseRideGraphics = this.make.graphics({ x: 0, y: 0 });
    horseRideGraphics.fillStyle(0xf6f0ff, 1);
    horseRideGraphics.fillRoundedRect(6, 20, 70, 26, 8);
    horseRideGraphics.fillRoundedRect(55, 7, 18, 20, 5);
    horseRideGraphics.fillTriangle(61, 8, 67, 0, 70, 10);
    horseRideGraphics.fillStyle(0xfbc2eb, 1);
    horseRideGraphics.fillRect(60, 4, 6, 11);
    horseRideGraphics.fillStyle(0xe4dcff, 1);
    horseRideGraphics.fillRect(13, 45, 7, 20);
    horseRideGraphics.fillRect(28, 45, 7, 20);
    horseRideGraphics.fillRect(48, 45, 7, 20);
    horseRideGraphics.fillRect(63, 45, 7, 20);
    horseRideGraphics.fillStyle(0xcaa16c, 1);
    horseRideGraphics.fillRect(31, 27, 15, 7);
    horseRideGraphics.fillStyle(0xf2b3ff, 1);
    horseRideGraphics.fillTriangle(71, 8, 76, -5, 81, 12);
    horseRideGraphics.generateTexture('horseRide', 82, 66);
    horseRideGraphics.destroy();

    const cactusTallGraphics = this.make.graphics({ x: 0, y: 0 });
    cactusTallGraphics.fillStyle(0x2b8a57, 1);
    cactusTallGraphics.fillRoundedRect(16, 10, 16, 60, 6);
    cactusTallGraphics.fillRoundedRect(4, 25, 12, 26, 5);
    cactusTallGraphics.fillRoundedRect(32, 20, 12, 24, 5);
    cactusTallGraphics.generateTexture('cactusTall', 48, 72);
    cactusTallGraphics.destroy();

    const cactusSmallGraphics = this.make.graphics({ x: 0, y: 0 });
    cactusSmallGraphics.fillStyle(0x25784a, 1);
    cactusSmallGraphics.fillRoundedRect(12, 14, 14, 42, 6);
    cactusSmallGraphics.fillRoundedRect(2, 26, 10, 18, 5);
    cactusSmallGraphics.generateTexture('cactusSmall', 32, 58);
    cactusSmallGraphics.destroy();

    const barrelGraphics = this.make.graphics({ x: 0, y: 0 });
    barrelGraphics.fillStyle(0x8b5a2b, 1);
    barrelGraphics.fillRoundedRect(0, 4, 26, 34, 6);
    barrelGraphics.fillStyle(0x5f3115, 1);
    barrelGraphics.fillRect(0, 10, 26, 4);
    barrelGraphics.fillRect(0, 28, 26, 4);
    barrelGraphics.generateTexture('barrel', 26, 40);
    barrelGraphics.destroy();

    const saloonSignGraphics = this.make.graphics({ x: 0, y: 0 });
    saloonSignGraphics.fillStyle(0x6f4324, 1);
    saloonSignGraphics.fillRoundedRect(0, 0, 110, 44, 8);
    saloonSignGraphics.fillStyle(0xf2d08b, 1);
    saloonSignGraphics.fillRoundedRect(6, 6, 98, 32, 6);
    saloonSignGraphics.fillStyle(0x8a2e63, 1);
    saloonSignGraphics.fillRect(18, 10, 74, 6);
    saloonSignGraphics.fillRect(18, 22, 54, 6);
    saloonSignGraphics.generateTexture('saloonSign', 110, 44);
    saloonSignGraphics.destroy();

    const lanternGraphics = this.make.graphics({ x: 0, y: 0 });
    lanternGraphics.fillStyle(0xf8d76b, 1);
    lanternGraphics.fillCircle(18, 22, 16);
    lanternGraphics.fillStyle(0xfff5c2, 1);
    lanternGraphics.fillCircle(18, 22, 8);
    lanternGraphics.fillStyle(0x8a2e63, 1);
    lanternGraphics.fillTriangle(18, 0, 8, 12, 28, 12);
    lanternGraphics.generateTexture('starLantern', 36, 38);
    lanternGraphics.destroy();

    const goonGraphics = this.make.graphics({ x: 0, y: 0 });
    goonGraphics.fillStyle(0x2c1b15, 1);
    goonGraphics.fillRect(4, 0, 24, 8);
    goonGraphics.fillStyle(0x6b4020, 1);
    goonGraphics.fillRect(0, 8, 32, 4);
    goonGraphics.fillStyle(0xcfa67e, 1);
    goonGraphics.fillRoundedRect(9, 12, 14, 12, 4);
    goonGraphics.fillStyle(0x5e2b18, 1);
    goonGraphics.fillRect(10, 15, 3, 2);
    goonGraphics.fillRect(19, 15, 3, 2);
    goonGraphics.fillStyle(0x3f2e5f, 1);
    goonGraphics.fillRoundedRect(6, 24, 20, 14, 4);
    goonGraphics.fillStyle(0x2b1a10, 1);
    goonGraphics.fillRect(8, 38, 6, 10);
    goonGraphics.fillRect(18, 38, 6, 10);
    goonGraphics.fillStyle(0x8a8a8a, 1);
    goonGraphics.fillRect(24, 28, 6, 4);
    goonGraphics.generateTexture('goon', 32, 48);
    goonGraphics.destroy();

    const bulletGraphics = this.make.graphics({ x: 0, y: 0 });
    bulletGraphics.fillStyle(0xffd26a, 1);
    bulletGraphics.fillRoundedRect(0, 0, 12, 4, 2);
    bulletGraphics.generateTexture('bullet', 12, 4);
    bulletGraphics.destroy();
  }
}
