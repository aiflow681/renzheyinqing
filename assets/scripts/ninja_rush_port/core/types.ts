export type Side = 'left' | 'right';
// 新增：磁铁、护盾、追踪导弹
export type EntityType = 'spike' | 'shuriken' | 'coin' | 'laser' | 'heart' | 'magnet' | 'shield' | 'missile';

export interface Ninja {
    x: number;
    y: number;
    yOffset: number; // 用于跳跃时的抛物线效果
    vx: number;
    vy: number;
    side: Side;
    isDashing: boolean;
    energy: number; // 冲刺能量
    health: number; // 当前生命值
    invincibleTimer: number; // 受伤后的无敌时间计时器
    hasShield: boolean; // 是否拥有护盾
    magnetTimer: number; // 磁铁效果剩余时间
}

export interface Entity {
    id: number;
    type: EntityType;
    side?: Side; // 尖刺附着的墙壁方向
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number; // 旋转角度
    vx: number;
    vy: number;
    markedForDeletion: boolean; // 是否标记为删除
    gapX?: number; // 激光缺口的X坐标
    gapWidth?: number; // 激光缺口的宽度
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface Trail {
    x: number;
    y: number;
    life: number;
    isDashing: boolean; // 是否是冲刺时的残影
}

export interface FloatingText {
    id: number;
    text: string;
    x: number;
    y: number;
    life: number;
    color: string;
    vy: number;
    scale: number;
}

export interface GameState {
    ninja: Ninja;
    entities: Entity[];
    particles: Particle[];
    trail: Trail[];
    floatingTexts: FloatingText[];
    speed: number; // 当前游戏全局滚动速度
    score: number; // 得分
    combo: number; // 连击数
    comboTimer: number; // 连击维持倒计时
    width: number; // 画布宽度
    height: number; // 画布高度
    distanceSinceLastSpawn: number; // 距离上次生成障碍物的距离
    bgOffset: number; // 背景滚动偏移量
    status: 'menu' | 'playing' | 'gameover'; // 游戏状态
    shakeIntensity: number; // 屏幕震动强度
    bgHue: number; // 背景色调（随分数动态变化）
    isPointerDown: boolean; // 玩家是否按下屏幕
    pointerDownTime: number; // 按下屏幕的持续时间
    isFever: boolean; // 是否处于狂热模式
    feverTimer: number; // 狂热模式倒计时
}
