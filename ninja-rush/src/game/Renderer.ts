import { NINJA_SIZE, WALL_WIDTH, ENERGY_MAX, MAX_HEALTH, FEVER_COMBO_THRESHOLD } from './constants';
import { GameState } from './types';

export class GameRenderer {
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    drawHeartShape(ctx: CanvasRenderingContext2D, size: number) {
        ctx.beginPath();
        ctx.arc(-size/4, -size/4, size/4, Math.PI, 0, false);
        ctx.arc(size/4, -size/4, size/4, Math.PI, 0, false);
        ctx.lineTo(0, size/2);
        ctx.closePath();
    }

    draw(state: GameState) {
        const { ctx } = this;
        const { width, height, bgOffset, entities, trail, particles, floatingTexts, ninja, score, combo, shakeIntensity, bgHue, isFever } = state;

        ctx.save();

        if (shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * shakeIntensity;
            const dy = (Math.random() - 0.5) * shakeIntensity;
            ctx.translate(dx, dy);
        }

        // 狂热模式背景：彩虹色变换
        if (isFever) {
            const feverHue = (Date.now() / 5) % 360;
            ctx.fillStyle = `hsl(${feverHue}, 80%, 15%)`;
        } else {
            ctx.fillStyle = `hsl(${bgHue}, 30%, 8%)`;
        }
        ctx.fillRect(0, 0, width, height);

        // 冲刺或狂热模式的速度线
        if (ninja.isDashing || isFever) {
            const lineColor = isFever ? `hsla(${(Date.now() / 5) % 360}, 100%, 80%, 0.4)` : `hsla(${bgHue}, 100%, 80%, 0.3)`;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let i=0; i<20; i++) {
                const lx = Math.random() * width;
                const ly = Math.random() * height;
                const len = 50 + Math.random() * 200;
                ctx.moveTo(lx, ly);
                ctx.lineTo(lx, ly + len);
            }
            ctx.stroke();
        }

        // 背景网格线
        ctx.fillStyle = isFever ? `hsl(${(Date.now() / 5) % 360}, 60%, 25%)` : `hsl(${bgHue}, 40%, 15%)`;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < height / 100 + 2; i++) {
            const y = (i * 100 + bgOffset) % (height + 100) - 100;
            ctx.fillRect(width / 2 - 1, y, 2, 40);
        }
        ctx.globalAlpha = 1;

        // 墙壁
        const wallColor = isFever ? `hsl(${(Date.now() / 5) % 360}, 40%, 20%)` : `hsl(${bgHue}, 20%, 20%)`;
        ctx.fillStyle = wallColor;
        ctx.fillRect(0, 0, WALL_WIDTH, height);
        ctx.fillRect(width - WALL_WIDTH, 0, WALL_WIDTH, height);

        ctx.fillStyle = isFever ? `hsl(${(Date.now() / 5) % 360}, 50%, 30%)` : `hsl(${bgHue}, 30%, 30%)`;
        ctx.fillRect(WALL_WIDTH - 2, 0, 2, height);
        ctx.fillRect(width - WALL_WIDTH, 0, 2, height);

        // 实体绘制
        entities.forEach(ent => {
            ctx.save();
            
            if (ent.type === 'laser') {
                ctx.translate(0, ent.y + ent.height / 2);
                ctx.shadowColor = '#EF4444';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#EF4444';
                ctx.fillRect(WALL_WIDTH, -ent.height/2, (ent.gapX || 0) - WALL_WIDTH, ent.height);
                const rightX = (ent.gapX || 0) + (ent.gapWidth || 0);
                ctx.fillRect(rightX, -ent.height/2, width - WALL_WIDTH - rightX, ent.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowBlur = 0;
                ctx.fillRect(WALL_WIDTH, -ent.height/4, (ent.gapX || 0) - WALL_WIDTH, ent.height/2);
                ctx.fillRect(rightX, -ent.height/4, width - WALL_WIDTH - rightX, ent.height/2);
                
            } else {
                ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
                
                if (ent.type === 'spike') {
                    ctx.fillStyle = '#EF4444';
                    ctx.beginPath();
                    if (ent.side === 'left') {
                        ctx.moveTo(-ent.width/2, -ent.height/2);
                        ctx.lineTo(ent.width/2, 0);
                        ctx.lineTo(-ent.width/2, ent.height/2);
                    } else {
                        ctx.moveTo(ent.width/2, -ent.height/2);
                        ctx.lineTo(-ent.width/2, 0);
                        ctx.lineTo(ent.width/2, ent.height/2);
                    }
                    ctx.fill();
                    ctx.fillStyle = '#FCA5A5';
                    ctx.beginPath();
                    if (ent.side === 'left') {
                        ctx.moveTo(-ent.width/2, 0);
                        ctx.lineTo(ent.width/2, 0);
                        ctx.lineTo(-ent.width/2, ent.height/2);
                    } else {
                        ctx.moveTo(ent.width/2, 0);
                        ctx.lineTo(-ent.width/2, 0);
                        ctx.lineTo(ent.width/2, ent.height/2);
                    }
                    ctx.fill();
                } 
                else if (ent.type === 'shuriken') {
                    ctx.rotate(ent.rotation);
                    ctx.fillStyle = '#9CA3AF';
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        ctx.lineTo(0, -ent.height/2);
                        ctx.lineTo(ent.width/6, -ent.height/6);
                        ctx.rotate(Math.PI / 2);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = `hsl(${bgHue}, 30%, 8%)`;
                    ctx.beginPath();
                    ctx.arc(0, 0, ent.width/6, 0, Math.PI * 2);
                    ctx.fill();
                }
                else if (ent.type === 'missile') {
                    // 绘制追踪导弹
                    ctx.rotate(ent.rotation);
                    
                    // 导弹尾部火焰
                    ctx.fillStyle = '#F97316';
                    ctx.beginPath();
                    ctx.moveTo(-ent.width/3, ent.height/2);
                    ctx.lineTo(0, ent.height/2 + 15 + Math.random()*10);
                    ctx.lineTo(ent.width/3, ent.height/2);
                    ctx.fill();

                    // 导弹主体
                    ctx.fillStyle = '#DC2626';
                    ctx.fillRect(-ent.width/2, -ent.height/4, ent.width, ent.height*0.75);
                    
                    // 导弹头部
                    ctx.fillStyle = '#9CA3AF';
                    ctx.beginPath();
                    ctx.moveTo(-ent.width/2, -ent.height/4);
                    ctx.lineTo(0, -ent.height/2);
                    ctx.lineTo(ent.width/2, -ent.height/4);
                    ctx.fill();
                }
                else if (ent.type === 'coin') {
                    const scaleX = Math.abs(Math.cos(ent.rotation));
                    ctx.scale(scaleX, 1);
                    ctx.fillStyle = '#F59E0B'; 
                    ctx.beginPath();
                    ctx.arc(0, 0, ent.width/2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#FBBF24'; 
                    ctx.beginPath();
                    ctx.arc(0, 0, ent.width/3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#B45309'; 
                    ctx.fillRect(-ent.width/6, -ent.height/6, ent.width/3, ent.height/3);
                }
                else if (ent.type === 'heart') {
                    const scale = 1 + Math.sin(Date.now() / 150) * 0.1;
                    ctx.scale(scale, scale);
                    ctx.fillStyle = '#EF4444';
                    this.drawHeartShape(ctx, ent.width);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(-ent.width/8, -ent.width/4, ent.width/8, 0, Math.PI*2);
                    ctx.fill();
                }
                else if (ent.type === 'magnet') {
                    // 绘制磁铁道具 (U型)
                    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                    ctx.scale(scale, scale);
                    ctx.fillStyle = '#EF4444'; // 红色部分
                    ctx.beginPath();
                    ctx.arc(0, 0, ent.width/2, Math.PI, 0);
                    ctx.lineTo(ent.width/2, ent.height/3);
                    ctx.lineTo(ent.width/4, ent.height/3);
                    ctx.lineTo(ent.width/4, 0);
                    ctx.arc(0, 0, ent.width/4, 0, Math.PI, true);
                    ctx.lineTo(-ent.width/4, ent.height/3);
                    ctx.lineTo(-ent.width/2, ent.height/3);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 磁铁银色两极
                    ctx.fillStyle = '#D1D5DB';
                    ctx.fillRect(-ent.width/2, ent.height/3, ent.width/4, ent.height/6);
                    ctx.fillRect(ent.width/4, ent.height/3, ent.width/4, ent.height/6);
                }
                else if (ent.type === 'shield') {
                    // 绘制护盾道具 (六边形)
                    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                    ctx.scale(scale, scale);
                    ctx.fillStyle = '#3B82F6';
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        ctx.lineTo(Math.cos(i * Math.PI / 3) * ent.width/2, Math.sin(i * Math.PI / 3) * ent.width/2);
                    }
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#93C5FD';
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        ctx.lineTo(Math.cos(i * Math.PI / 3) * ent.width/4, Math.sin(i * Math.PI / 3) * ent.width/4);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }
            
            ctx.restore();
        });

        // 轨迹
        trail.forEach(t => {
            ctx.save();
            ctx.globalAlpha = t.life * (t.isDashing || isFever ? 0.6 : 0.3);
            ctx.translate(t.x + NINJA_SIZE / 2, t.y + NINJA_SIZE / 2);
            
            if (t.isDashing || isFever) {
                ctx.fillStyle = isFever ? '#FDE047' : '#06B6D4'; 
                ctx.fillRect(-NINJA_SIZE / 2 - 2, -NINJA_SIZE / 2 - 2, NINJA_SIZE + 4, NINJA_SIZE + 4);
            } else {
                ctx.fillStyle = '#1F2937';
                ctx.fillRect(-NINJA_SIZE / 2, -NINJA_SIZE / 2, NINJA_SIZE, NINJA_SIZE);
            }
            ctx.restore();
        });
        ctx.globalAlpha = 1;

        // 粒子
        particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 忍者
        if (state.status !== 'gameover') {
            ctx.save();
            
            if (ninja.invincibleTimer > 0) {
                if (Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.3;
            }

            ctx.translate(ninja.x + NINJA_SIZE / 2, ninja.y + ninja.yOffset + NINJA_SIZE / 2);
            
            // 磁铁光环
            if (ninja.magnetTimer > 0) {
                ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + Math.sin(Date.now()/100)*0.3})`; // 紫色呼吸光环
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, NINJA_SIZE, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 护盾光环
            if (ninja.hasShield) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // 蓝色半透明护盾
                ctx.strokeStyle = '#3B82F6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, NINJA_SIZE * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // 冲刺/狂热光环
            if (ninja.isDashing || isFever) {
                const auraColor = isFever ? '#FDE047' : '#06B6D4';
                ctx.shadowColor = auraColor;
                ctx.shadowBlur = 15;
                ctx.fillStyle = auraColor;
                ctx.fillRect(-NINJA_SIZE / 2 - 2, -NINJA_SIZE / 2 - 2, NINJA_SIZE + 4, NINJA_SIZE + 4);
                ctx.shadowBlur = 0;
            }

            // 身体
            ctx.fillStyle = '#111827';
            ctx.fillRect(-NINJA_SIZE / 2, -NINJA_SIZE / 2, NINJA_SIZE, NINJA_SIZE);
            
            // 头巾
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(-NINJA_SIZE / 2, -NINJA_SIZE / 2 + 6, NINJA_SIZE, 6);

            ctx.beginPath();
            if (ninja.vx < 0 || (ninja.vx === 0 && ninja.side === 'left')) {
                ctx.moveTo(NINJA_SIZE/2, -NINJA_SIZE/2 + 6);
                ctx.lineTo(NINJA_SIZE/2 + 10, -NINJA_SIZE/2 - 5 + Math.sin(Date.now()/100)*5);
                ctx.lineTo(NINJA_SIZE/2, -NINJA_SIZE/2 + 12);
            } else {
                ctx.moveTo(-NINJA_SIZE/2, -NINJA_SIZE/2 + 6);
                ctx.lineTo(-NINJA_SIZE/2 - 10, -NINJA_SIZE/2 - 5 + Math.sin(Date.now()/100)*5);
                ctx.lineTo(-NINJA_SIZE/2, -NINJA_SIZE/2 + 12);
            }
            ctx.fill();

            // 眼睛
            ctx.fillStyle = '#FFFFFF';
            let facingRight = ninja.vx > 0 || (ninja.vx === 0 && ninja.side === 'right');
            
            if (facingRight) {
                ctx.fillRect(2, -NINJA_SIZE / 2 + 14, 4, 4);
                ctx.fillRect(10, -NINJA_SIZE / 2 + 14, 4, 4);
            } else {
                ctx.fillRect(-6, -NINJA_SIZE / 2 + 14, 4, 4);
                ctx.fillRect(-14, -NINJA_SIZE / 2 + 14, 4, 4);
            }

            ctx.restore();
        }

        // 浮动文字
        floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${20 * ft.scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });
        ctx.globalAlpha = 1;

        // 狂热模式屏幕边框特效
        if (isFever) {
            ctx.strokeStyle = `hsla(${(Date.now() / 5) % 360}, 100%, 50%, 0.8)`;
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, width, height);
        }

        // UI: 得分
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillText(Math.floor(score).toString(), width / 2, 60);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // UI: 生命血条
        const heartUiSize = 20;
        const heartPadding = 8;
        for (let i = 0; i < MAX_HEALTH; i++) {
            const hx = width - WALL_WIDTH - 10 - (MAX_HEALTH - i) * (heartUiSize + heartPadding);
            const hy = 20;
            
            ctx.save();
            ctx.translate(hx + heartUiSize/2, hy + heartUiSize/2);
            
            if (i < ninja.health) {
                ctx.fillStyle = '#EF4444';
                this.drawHeartShape(ctx, heartUiSize);
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                this.drawHeartShape(ctx, heartUiSize);
                ctx.stroke();
            }
            ctx.restore();
        }

        // UI: 连击与狂热进度
        if (isFever) {
            ctx.fillStyle = '#FDE047'; 
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('狂热模式!', width - WALL_WIDTH - 10, 80);
            
            const barWidth = 100;
            const barHeight = 6;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(width - WALL_WIDTH - 10 - barWidth, 90, barWidth, barHeight);
            ctx.fillStyle = '#FDE047';
            ctx.fillRect(width - WALL_WIDTH - 10 - barWidth, 90, barWidth * (state.feverTimer / 5000), barHeight);
        } else {
            // 正常连击显示
            ctx.fillStyle = '#38BDF8'; 
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`x${combo}`, width - WALL_WIDTH - 10, 80);
            
            const barWidth = 60;
            const barHeight = 6;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(width - WALL_WIDTH - 10 - barWidth, 90, barWidth, barHeight);
            
            // 连击进度条（向狂热模式冲刺）
            ctx.fillStyle = combo >= FEVER_COMBO_THRESHOLD - 3 ? '#FDE047' : '#38BDF8';
            ctx.fillRect(width - WALL_WIDTH - 10 - barWidth, 90, barWidth * (combo / FEVER_COMBO_THRESHOLD), barHeight);
        }

        // UI: 冲刺能量条
        const energyWidth = 100;
        const energyHeight = 8;
        const energyX = WALL_WIDTH + 10;
        const energyY = 40;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(energyX, energyY, energyWidth, energyHeight);
        
        if (ninja.energy > 80) ctx.fillStyle = '#06B6D4'; 
        else if (ninja.energy > 30) ctx.fillStyle = '#34D399'; 
        else ctx.fillStyle = '#EF4444'; 
        
        ctx.fillRect(energyX, energyY, energyWidth * (ninja.energy / ENERGY_MAX), energyHeight);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('能量', energyX, energyY - 5);

        ctx.restore();
    }
}
