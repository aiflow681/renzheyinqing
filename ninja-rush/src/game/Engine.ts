import { BASE_SPEED, MAX_SPEED, DASH_SPEED_MULT, HORIZONTAL_SPEED, GRAVITY, JUMP_VELOCITY, ENERGY_MAX, MAX_HEALTH, INVINCIBLE_DURATION, NINJA_SIZE, OBSTACLE_HEIGHT, OBSTACLE_WIDTH, WALL_WIDTH, COIN_SIZE, SHURIKEN_SIZE, LASER_HEIGHT, HEART_SIZE, POWERUP_SIZE, FEVER_COMBO_THRESHOLD, FEVER_DURATION, MAGNET_DURATION } from './constants';
import { GameState, Side, Entity } from './types';

export class GameEngine {
    state: GameState;
    onGameOver?: (score: number) => void;

    constructor(width: number, height: number) {
        this.state = this.getInitialState(width, height);
    }

    getInitialState(width: number, height: number): GameState {
        return {
            ninja: {
                x: WALL_WIDTH,
                y: height - 150,
                yOffset: 0,
                vx: 0,
                vy: 0,
                side: 'left',
                isDashing: false,
                energy: ENERGY_MAX,
                health: MAX_HEALTH,
                invincibleTimer: 0,
                hasShield: false,
                magnetTimer: 0
            },
            entities: [],
            particles: [],
            trail: [],
            floatingTexts: [],
            speed: BASE_SPEED,
            score: 0,
            combo: 0,
            comboTimer: 0,
            width,
            height,
            distanceSinceLastSpawn: 0,
            bgOffset: 0,
            status: 'menu',
            shakeIntensity: 0,
            bgHue: 220,
            isPointerDown: false,
            pointerDownTime: 0,
            isFever: false,
            feverTimer: 0
        };
    }

    reset() {
        const { width, height } = this.state;
        this.state = this.getInitialState(width, height);
        this.state.status = 'playing';
    }

    resize(width: number, height: number) {
        this.state.width = width;
        this.state.height = height;
        this.state.ninja.y = height - 150;
        if (this.state.ninja.vx === 0) {
            this.state.ninja.x = this.state.ninja.side === 'left' ? WALL_WIDTH : width - WALL_WIDTH - NINJA_SIZE;
        }
    }

    spawnParticles(x: number, y: number, color: string, count: number, speed: number = 0.2, sizeBase: number = 2) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed;
            this.state.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1, maxLife: 1,
                color,
                size: Math.random() * sizeBase + 1
            });
        }
    }

    addFloatingText(text: string, x: number, y: number, color: string, scale: number = 1) {
        this.state.floatingTexts.push({
            id: Math.random(),
            text, x, y,
            life: 1, color, vy: -0.05, scale
        });
    }

    handlePointerDown() {
        if (this.state.status !== 'playing') return;
        
        this.state.isPointerDown = true;
        this.state.pointerDownTime = 0;

        const ninja = this.state.ninja;

        // 空中无限转向
        if (ninja.vx === 0) {
            ninja.vx = ninja.side === 'left' ? HORIZONTAL_SPEED : -HORIZONTAL_SPEED;
        } else {
            ninja.vx = -ninja.vx;
        }

        // 跳跃抛物线
        ninja.vy = JUMP_VELOCITY;

        // 跳跃粒子
        const px = ninja.x + NINJA_SIZE / 2;
        const py = ninja.y + ninja.yOffset + NINJA_SIZE;
        this.spawnParticles(px, py, '#D1D5DB', 5, 0.15, 2);
    }

    handlePointerUp() {
        this.state.isPointerDown = false;
        this.state.ninja.isDashing = false;
    }

    triggerFever() {
        this.state.isFever = true;
        this.state.feverTimer = FEVER_DURATION;
        this.state.shakeIntensity = 15;
        this.addFloatingText('狂热时刻!!!', this.state.width/2, this.state.height/2, '#FDE047', 3);
        
        // 将所有非增益道具转化为金币
        this.state.entities.forEach(ent => {
            if (ent.type !== 'coin' && ent.type !== 'heart' && ent.type !== 'magnet' && ent.type !== 'shield') {
                ent.type = 'coin';
                ent.width = COIN_SIZE;
                ent.height = COIN_SIZE;
                ent.vx = 0;
                ent.vy = 0;
                this.spawnParticles(ent.x, ent.y, '#FDE047', 5, 0.2, 2);
            }
        });
    }

    spawnEntities() {
        const state = this.state;
        const rand = Math.random();
        const side: Side = Math.random() > 0.5 ? 'left' : 'right';
        
        // 狂热模式下只生成大量金币
        if (state.isFever) {
            const count = Math.floor(Math.random() * 3) + 6; 
            const centerX = state.width / 2 - COIN_SIZE / 2;
            for (let i = 0; i < count; i++) {
                // V字形金币阵列
                const offsetX = i < count/2 ? -i*20 : (i-count/2)*20;
                state.entities.push({
                    id: Math.random(), type: 'coin',
                    x: Math.max(WALL_WIDTH, Math.min(state.width - WALL_WIDTH - COIN_SIZE, centerX + offsetX)), 
                    y: -COIN_SIZE - i * 30, 
                    width: COIN_SIZE, height: COIN_SIZE,
                    rotation: 0, vx: 0, vy: 0, markedForDeletion: false
                });
            }
            return;
        }

        // 正常模式生成逻辑
        if (rand < 0.03) {
            // 3% 概率生成爱心
            state.entities.push({
                id: Math.random(), type: 'heart',
                x: state.width / 2 - HEART_SIZE / 2, y: -HEART_SIZE, 
                width: HEART_SIZE, height: HEART_SIZE,
                rotation: 0, vx: 0, vy: 0.1, markedForDeletion: false
            });
        } else if (rand < 0.06 && !state.ninja.magnetTimer) {
            // 3% 概率生成磁铁
            state.entities.push({
                id: Math.random(), type: 'magnet',
                x: state.width / 2 - POWERUP_SIZE / 2, y: -POWERUP_SIZE, 
                width: POWERUP_SIZE, height: POWERUP_SIZE,
                rotation: 0, vx: 0, vy: 0.1, markedForDeletion: false
            });
        } else if (rand < 0.09 && !state.ninja.hasShield) {
            // 3% 概率生成护盾
            state.entities.push({
                id: Math.random(), type: 'shield',
                x: state.width / 2 - POWERUP_SIZE / 2, y: -POWERUP_SIZE, 
                width: POWERUP_SIZE, height: POWERUP_SIZE,
                rotation: 0, vx: 0, vy: 0.1, markedForDeletion: false
            });
        } else if (rand < 0.25) {
            // 生成尖刺墙
            state.entities.push({
                id: Math.random(), type: 'spike', side,
                x: side === 'left' ? WALL_WIDTH : state.width - WALL_WIDTH - OBSTACLE_WIDTH,
                y: -OBSTACLE_HEIGHT, width: OBSTACLE_WIDTH, height: OBSTACLE_HEIGHT,
                rotation: 0, vx: 0, vy: 0, markedForDeletion: false
            });
        } else if (rand < 0.55) {
            // 生成金币阵列 (正弦波浪形)
            const count = Math.floor(Math.random() * 4) + 5;
            const amplitude = 60 + Math.random() * 40;
            const frequency = 0.4 + Math.random() * 0.3;
            const centerX = state.width / 2 - COIN_SIZE / 2;
            for (let i = 0; i < count; i++) {
                state.entities.push({
                    id: Math.random(), type: 'coin',
                    x: centerX + Math.sin(i * frequency) * amplitude, 
                    y: -COIN_SIZE - i * 45, 
                    width: COIN_SIZE, height: COIN_SIZE,
                    rotation: 0, vx: 0, vy: 0, markedForDeletion: false
                });
            }
        } else if (rand < 0.75) {
            // 生成移动飞镖
            state.entities.push({
                id: Math.random(), type: 'shuriken',
                x: state.width / 2 - SHURIKEN_SIZE / 2, y: -SHURIKEN_SIZE, 
                width: SHURIKEN_SIZE, height: SHURIKEN_SIZE,
                rotation: 0, vx: (Math.random() - 0.5) * 0.25, vy: 0.15, markedForDeletion: false
            });
        } else if (rand < 0.85) {
            // 生成追踪导弹 (新增敌人类型)
            state.entities.push({
                id: Math.random(), type: 'missile',
                x: Math.random() > 0.5 ? WALL_WIDTH + 10 : state.width - WALL_WIDTH - 40, 
                y: -OBSTACLE_HEIGHT, 
                width: 20, height: 40,
                rotation: 0, vx: 0, vy: 0.1, markedForDeletion: false
            });
        } else {
            // 生成激光门
            const gapWidth = NINJA_SIZE * 2.5 + Math.random() * NINJA_SIZE;
            const minGapX = WALL_WIDTH + 10;
            const maxGapX = state.width - WALL_WIDTH - gapWidth - 10;
            const gapX = minGapX + Math.random() * (maxGapX - minGapX);
            state.entities.push({
                id: Math.random(), type: 'laser',
                x: 0, y: -LASER_HEIGHT, 
                width: state.width, height: LASER_HEIGHT,
                rotation: 0, vx: 0, vy: 0, markedForDeletion: false,
                gapX, gapWidth
            });
        }
    }

    update(dt: number) {
        if (this.state.status !== 'playing') return;

        const state = this.state;
        const ninja = state.ninja;
        
        // 无敌时间递减
        if (ninja.invincibleTimer > 0) ninja.invincibleTimer -= dt;
        
        // 磁铁时间递减
        if (ninja.magnetTimer > 0) ninja.magnetTimer -= dt;

        // 狂热模式逻辑
        if (state.isFever) {
            state.feverTimer -= dt;
            ninja.energy = ENERGY_MAX; // 狂热模式无限能量
            if (state.feverTimer <= 0) {
                state.isFever = false;
                state.combo = 0; // 结束时重置连击
                this.addFloatingText('狂热结束', state.width/2, state.height/2, '#FFFFFF', 2);
            }
        } else {
            // 检查是否触发狂热
            if (state.combo >= FEVER_COMBO_THRESHOLD) {
                this.triggerFever();
            }
        }

        // 冲刺逻辑 (长按屏幕)
        if (state.isPointerDown) {
            state.pointerDownTime += dt;
            if (state.pointerDownTime > 150 && ninja.energy > 0) {
                ninja.isDashing = true;
                ninja.energy -= dt * 0.08; // 消耗能量
                if (ninja.energy <= 0) {
                    ninja.isDashing = false;
                    ninja.energy = 0;
                }
            } else {
                ninja.isDashing = false;
            }
        } else {
            ninja.isDashing = false;
            ninja.energy = Math.min(ENERGY_MAX, ninja.energy + dt * 0.03); // 恢复能量
        }

        // 狂热模式下速度极快
        let currentSpeed = ninja.isDashing ? state.speed * DASH_SPEED_MULT : state.speed;
        if (state.isFever) currentSpeed = Math.max(currentSpeed, MAX_SPEED * 1.5);

        // 难度递增 (根据分数提升速度)
        state.score += currentSpeed * dt * 0.02;
        state.speed = Math.min(MAX_SPEED, BASE_SPEED + Math.floor(state.score / 200) * 0.05);
        
        // 视觉效果更新
        state.bgOffset = (state.bgOffset + currentSpeed * dt * 0.5) % state.height;
        state.bgHue = (220 + state.score * 0.1) % 360;
        
        if (state.shakeIntensity > 0) {
            state.shakeIntensity -= dt * 0.01;
            if (state.shakeIntensity < 0) state.shakeIntensity = 0;
        }

        if (state.comboTimer > 0 && !state.isFever) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) state.combo = 0;
        }

        // 生成残影轨迹
        if (ninja.vx !== 0 || ninja.isDashing || Math.random() < 0.3) {
            state.trail.push({ 
                x: ninja.x, y: ninja.y + ninja.yOffset, life: 1, 
                isDashing: ninja.isDashing 
            });
        }
        
        for (let i = state.trail.length - 1; i >= 0; i--) {
            state.trail[i].life -= dt * (state.trail[i].isDashing ? 0.005 : 0.003);
            state.trail[i].y += currentSpeed * dt;
            if (state.trail[i].life <= 0) state.trail.splice(i, 1);
        }

        // 忍者水平物理运动
        ninja.x += ninja.vx * dt;
        if (ninja.x <= WALL_WIDTH) {
            ninja.x = WALL_WIDTH;
            ninja.vx = 0;
            ninja.side = 'left';
            this.spawnParticles(WALL_WIDTH, ninja.y + ninja.yOffset + NINJA_SIZE/2, '#D1D5DB', 3, 0.1, 1.5);
        } else if (ninja.x >= state.width - WALL_WIDTH - NINJA_SIZE) {
            ninja.x = state.width - WALL_WIDTH - NINJA_SIZE;
            ninja.vx = 0;
            ninja.side = 'right';
            this.spawnParticles(state.width - WALL_WIDTH, ninja.y + ninja.yOffset + NINJA_SIZE/2, '#D1D5DB', 3, 0.1, 1.5);
        }

        // 忍者垂直物理运动 (跳跃抛物线)
        ninja.yOffset += ninja.vy * dt;
        ninja.vy += GRAVITY * dt;
        if (ninja.yOffset > 0) {
            ninja.yOffset = 0;
            ninja.vy = 0;
        }

        // 贴墙滑行粒子
        if (ninja.vx === 0 && Math.random() < 0.15) {
            const px = ninja.side === 'left' ? WALL_WIDTH : state.width - WALL_WIDTH;
            this.spawnParticles(px, ninja.y + ninja.yOffset + NINJA_SIZE, '#9CA3AF', 1, 0.05, 1.5);
        }

        // 实体生成逻辑
        state.distanceSinceLastSpawn += currentSpeed * dt;
        // 狂热模式下生成频率极高
        const spawnThreshold = state.isFever ? 80 : Math.max(150, 300 - (state.speed - BASE_SPEED) * 200) + Math.random() * 100;
        if (state.distanceSinceLastSpawn > spawnThreshold) {
            state.distanceSinceLastSpawn = 0;
            this.spawnEntities();
        }

        // 实体更新与碰撞检测
        const ninjaRect = { 
            x: ninja.x + 4, y: ninja.y + ninja.yOffset + 4, 
            width: NINJA_SIZE - 8, height: NINJA_SIZE - 8 
        };
        
        if (ninja.isDashing) {
            ninjaRect.x -= 10; ninjaRect.y -= 10;
            ninjaRect.width += 20; ninjaRect.height += 20;
        }

        for (let i = state.entities.length - 1; i >= 0; i--) {
            const ent = state.entities[i];
            
            // 磁铁吸引金币逻辑
            if (ninja.magnetTimer > 0 && ent.type === 'coin') {
                const dx = (ninja.x + NINJA_SIZE/2) - (ent.x + ent.width/2);
                const dy = (ninja.y + ninja.yOffset + NINJA_SIZE/2) - (ent.y + ent.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 300) {
                    // 施加向忍者的引力
                    ent.vx += (dx / dist) * 0.005 * dt;
                    ent.vy += (dy / dist) * 0.005 * dt;
                }
            }

            // 追踪导弹逻辑
            if (ent.type === 'missile') {
                const dx = (ninja.x + NINJA_SIZE/2) - (ent.x + ent.width/2);
                ent.vx += dx * 0.00005 * dt; // 缓慢追踪X轴
                ent.vx = Math.max(-0.2, Math.min(0.2, ent.vx)); // 限制最大水平速度
                ent.rotation = Math.atan2(ent.vy + currentSpeed, ent.vx) - Math.PI/2; // 导弹朝向
                
                // 尾部火焰粒子
                if (Math.random() < 0.4) {
                    this.spawnParticles(ent.x + ent.width/2, ent.y, '#F97316', 1, 0.05, 2);
                }
            }

            // 实体移动
            ent.y += (currentSpeed + ent.vy) * dt;
            ent.x += ent.vx * dt;
            
            if (ent.type === 'shuriken') ent.rotation += dt * 0.01;
            if (ent.type === 'coin' && ninja.magnetTimer <= 0) ent.rotation += dt * 0.005; // 被磁铁吸附时不自转

            // 飞镖碰到墙壁反弹
            if (ent.type === 'shuriken' || ent.type === 'missile') {
                if (ent.x <= WALL_WIDTH || ent.x + ent.width >= state.width - WALL_WIDTH) {
                    ent.vx *= -1;
                    ent.x = Math.max(WALL_WIDTH, Math.min(ent.x, state.width - WALL_WIDTH - ent.width));
                }
            }

            // 碰撞检测
            const entRect = { x: ent.x + 4, y: ent.y + 4, width: ent.width - 8, height: ent.height - 8 };
            let isColliding = false;

            if (ent.type === 'laser') {
                const hitY = ninjaRect.y < ent.y + ent.height && ninjaRect.y + ninjaRect.height > ent.y;
                const inGap = ent.gapX !== undefined && ent.gapWidth !== undefined &&
                              ninjaRect.x > ent.gapX && ninjaRect.x + ninjaRect.width < ent.gapX + ent.gapWidth;
                isColliding = hitY && !inGap;
            } else {
                isColliding = ninjaRect.x < entRect.x + entRect.width &&
                              ninjaRect.x + ninjaRect.width > entRect.x &&
                              ninjaRect.y < entRect.y + entRect.height &&
                              ninjaRect.y + ninjaRect.height > entRect.y;
            }
            
            if (!ent.markedForDeletion && isColliding) {
                if (ent.type === 'coin') {
                    ent.markedForDeletion = true;
                    if (!state.isFever) {
                        state.combo++;
                        state.comboTimer = 2000;
                    }
                    const points = 10 * Math.min(5, state.combo || 1);
                    state.score += points;
                    
                    this.spawnParticles(ent.x + ent.width/2, ent.y + ent.height/2, '#FBBF24', 8, 0.15, 2);
                    this.addFloatingText(`+${points}`, ent.x, ent.y, '#FBBF24', state.combo > 1 ? 1.2 : 1);
                    
                    if (state.combo > 1 && !state.isFever) {
                        this.addFloatingText(`${state.combo}连击!`, ninja.x, ninja.y + ninja.yOffset - 20, '#38BDF8', 1.5);
                    }
                } else if (ent.type === 'heart') {
                    ent.markedForDeletion = true;
                    if (ninja.health < MAX_HEALTH) {
                        ninja.health++;
                        this.addFloatingText('+1 生命', ent.x, ent.y, '#10B981', 1.2);
                    } else {
                        state.score += 50;
                        this.addFloatingText('+50 分', ent.x, ent.y, '#FBBF24', 1.2);
                    }
                    this.spawnParticles(ent.x + ent.width/2, ent.y + ent.height/2, '#EF4444', 15, 0.25, 3);
                } else if (ent.type === 'magnet') {
                    ent.markedForDeletion = true;
                    ninja.magnetTimer = MAGNET_DURATION;
                    this.addFloatingText('磁铁!', ent.x, ent.y, '#A855F7', 1.5);
                    this.spawnParticles(ent.x + ent.width/2, ent.y + ent.height/2, '#A855F7', 20, 0.3, 3);
                } else if (ent.type === 'shield') {
                    ent.markedForDeletion = true;
                    ninja.hasShield = true;
                    this.addFloatingText('护盾!', ent.x, ent.y, '#3B82F6', 1.5);
                    this.spawnParticles(ent.x + ent.width/2, ent.y + ent.height/2, '#3B82F6', 20, 0.3, 3);
                } else if (ent.type === 'spike' || ent.type === 'shuriken' || ent.type === 'laser' || ent.type === 'missile') {
                    if (ninja.isDashing || state.isFever) {
                        // 冲刺或狂热模式无敌，摧毁障碍物
                        ent.markedForDeletion = true;
                        state.score += 30;
                        state.shakeIntensity = 4;
                        this.spawnParticles(ent.x + (ent.width || 0)/2, ent.y + (ent.height || 0)/2, '#EF4444', 15, 0.3, 3);
                        this.addFloatingText('破!', ent.x + (ent.width || 0)/2, ent.y, '#EF4444', 1.5);
                    } else if (ninja.invincibleTimer <= 0) {
                        // 受到伤害
                        ent.markedForDeletion = true;
                        state.combo = 0;
                        
                        if (ninja.hasShield) {
                            // 护盾抵挡伤害
                            ninja.hasShield = false;
                            ninja.invincibleTimer = 500; // 短暂无敌
                            state.shakeIntensity = 5;
                            this.spawnParticles(ninja.x + NINJA_SIZE/2, ninja.y + ninja.yOffset + NINJA_SIZE/2, '#3B82F6', 30, 0.5, 4);
                            this.addFloatingText('护盾破裂!', ninja.x, ninja.y + ninja.yOffset - 20, '#3B82F6', 1.5);
                        } else {
                            // 扣除生命
                            ninja.health--;
                            if (ninja.health <= 0) {
                                state.status = 'gameover';
                                state.shakeIntensity = 15;
                                this.spawnParticles(ninja.x + NINJA_SIZE/2, ninja.y + ninja.yOffset + NINJA_SIZE/2, '#EF4444', 40, 0.6, 5);
                                if (this.onGameOver) this.onGameOver(Math.floor(state.score));
                                return;
                            } else {
                                ninja.invincibleTimer = INVINCIBLE_DURATION;
                                state.shakeIntensity = 8;
                                this.spawnParticles(ninja.x + NINJA_SIZE/2, ninja.y + ninja.yOffset + NINJA_SIZE/2, '#EF4444', 20, 0.4, 3);
                                this.addFloatingText('-1 生命', ninja.x, ninja.y + ninja.yOffset - 20, '#EF4444', 1.5);
                            }
                        }
                    }
                }
            }

            if (ent.y > state.height || ent.markedForDeletion) {
                state.entities.splice(i, 1);
            }
        }

        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 0.002;
            if (p.life <= 0) state.particles.splice(i, 1);
        }

        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
            const ft = state.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt * 0.0015;
            if (ft.life <= 0) state.floatingTexts.splice(i, 1);
        }
    }
}
