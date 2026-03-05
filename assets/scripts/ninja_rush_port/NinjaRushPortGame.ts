import {
    _decorator,
    Color,
    Component,
    EventKeyboard,
    EventMouse,
    EventTouch,
    Graphics,
    HorizontalTextAlignment,
    Input,
    KeyCode,
    Label,
    LabelOutline,
    Layers,
    Node,
    UITransform,
    Vec3,
    VerticalTextAlignment,
    input,
    sys,
    view,
} from 'cc';

import { GameEngine } from './core/Engine';
import { COIN_SIZE, ENERGY_MAX, FEVER_COMBO_THRESHOLD, MAX_HEALTH, NINJA_SIZE, WALL_WIDTH } from './core/constants';
import { CocosCanvas2DAdapter, type AdapterTextCommand } from './core/CocosCanvas2DAdapter';
import { GameRenderer as SourceGameRenderer } from './core/Renderer';
import type { Entity, GameState } from './core/types';

const { ccclass } = _decorator;

interface BtnRect {
    id: 'start' | 'restart' | 'home';
    x: number; // source-space top-left
    y: number; // source-space top-left
    w: number;
    h: number;
}

@ccclass('NinjaRushPortGame')
export class NinjaRushPortGame extends Component {
    private canvasTf: UITransform | null = null;
    private drawNode: Node | null = null;
    private uiTextRoot: Node | null = null;
    private g: Graphics | null = null;

    private titleLabel: Label | null = null;
    private subLabel: Label | null = null;
    private primaryBtnLabel: Label | null = null;
    private secondaryBtnLabel: Label | null = null;
    private tertiaryBtnLabel: Label | null = null;
    private scoreLabel: Label | null = null;
    private hudLeftLabel: Label | null = null;
    private hudRightLabel: Label | null = null;
    private centerBannerLabel: Label | null = null;

    private engine: GameEngine | null = null;
    private canvasAdapter: CocosCanvas2DAdapter | null = null;
    private sourceRenderer: SourceGameRenderer | null = null;
    private bestScore = 0;
    private sourceTextPool: Label[] = [];
    private screenState: 'menu' | 'playing' | 'gameover' = 'menu';

    // Virtual game canvas: keep gameplay proportions close to original H5.
    private readonly baseVirtualW = 390;
    private canvasW = 390;
    private canvasH = 844;
    private halfW = 195;
    private halfH = 422;
    private displayW = 720;
    private displayH = 1280;

    private activeButtons: BtnRect[] = [];
    private colorCache: Record<string, Color> = {};
    private tmpColor = new Color();
    private tmpPoint = new Vec3();
    private readonly bestScoreKey = 'ninja-rush-port-best-score';
    private suppressMouseUntil = 0;

    onLoad(): void {
        this.canvasTf = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        this.createLayers();
        this.createLabels();
        this.syncCanvasSize(true);
        this.engine = new GameEngine(this.canvasW, this.canvasH);
        this.canvasAdapter = new CocosCanvas2DAdapter();
        this.sourceRenderer = new SourceGameRenderer(this.canvasAdapter);
        this.screenState = 'menu';
        this.bestScore = this.loadBestScore();
        this.engine.onGameOver = (score) => {
            this.bestScore = Math.max(this.bestScore, score);
            this.saveBestScore(this.bestScore);
            this.screenState = 'gameover';
        };
        this.bindInput();
        this.render();
    }

    onDestroy(): void {
        this.unbindInput();
    }

    update(dt: number): void {
        this.syncCanvasSize(false);
        if (!this.engine) return;
        if (this.screenState === 'playing' && this.engine.state.status === 'playing') {
            const ms = Math.max(0, dt * 1000);
            if (ms > 0 && ms < 100) this.engine.update(ms);
        }
        this.render();
    }

    private createLayers(): void {
        this.drawNode = new Node('NinjaRushPortDraw');
        this.drawNode.layer = Layers.Enum.UI_2D;
        this.node.addChild(this.drawNode);
        this.drawNode.setPosition(0, 0, 0);
        const tf = this.drawNode.addComponent(UITransform);
        tf.setAnchorPoint(0.5, 0.5);
        tf.setContentSize(this.canvasW, this.canvasH);
        this.g = this.drawNode.addComponent(Graphics);

        this.uiTextRoot = new Node('NinjaRushPortText');
        this.uiTextRoot.layer = Layers.Enum.UI_2D;
        this.node.addChild(this.uiTextRoot);
        this.uiTextRoot.setPosition(0, 0, 0);
        const tfText = this.uiTextRoot.addComponent(UITransform);
        tfText.setAnchorPoint(0.5, 0.5);
        tfText.setContentSize(this.canvasW, this.canvasH);
    }

    private createLabels(): void {
        this.titleLabel = this.newLabel('Title', 40, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
        this.subLabel = this.newLabel('Sub', 18, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
        this.primaryBtnLabel = this.newLabel('PrimaryBtn', 22, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
        this.secondaryBtnLabel = this.newLabel('SecondaryBtn', 18, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
        this.tertiaryBtnLabel = this.newLabel('TertiaryBtn', 18, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
        this.scoreLabel = this.newLabel('Score', 30, HorizontalTextAlignment.CENTER, VerticalTextAlignment.TOP);
        this.hudLeftLabel = this.newLabel('HudLeft', 14, HorizontalTextAlignment.LEFT, VerticalTextAlignment.TOP);
        this.hudRightLabel = this.newLabel('HudRight', 14, HorizontalTextAlignment.RIGHT, VerticalTextAlignment.TOP);
        this.centerBannerLabel = this.newLabel('CenterBanner', 24, HorizontalTextAlignment.CENTER, VerticalTextAlignment.CENTER);
    }

    private newLabel(name: string, size: number, hAlign: HorizontalTextAlignment, vAlign: VerticalTextAlignment): Label {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        this.uiTextRoot!.addChild(n);
        n.setPosition(0, 0, 0);
        const tf = n.addComponent(UITransform);
        tf.setAnchorPoint(0.5, 0.5);
        tf.setContentSize(300, 80);
        const lb = n.addComponent(Label);
        lb.useSystemFont = true;
        lb.fontSize = size;
        lb.lineHeight = Math.round(size * 1.25);
        lb.horizontalAlign = hAlign;
        lb.verticalAlign = vAlign;
        lb.color = new Color(255, 255, 255, 255);
        lb.string = '';
        return lb;
    }

    private bindInput(): void {
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private unbindInput(): void {
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(e: EventKeyboard): void {
        if (!this.engine) return;
        if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
            if (this.screenState === 'menu') this.startGame();
            else if (this.screenState === 'gameover') this.startGame();
        } else if (e.keyCode === KeyCode.ESCAPE && this.screenState === 'gameover') {
            this.goHome();
        }
    }

    private onMouseDown(e: EventMouse): void {
        if (typeof performance !== 'undefined' && performance.now() < this.suppressMouseUntil) return;
        const p = e.getUILocation();
        this.handlePointerDownAt(p.x, p.y);
    }

    private onMouseUp(_e: EventMouse): void {
        if (typeof performance !== 'undefined' && performance.now() < this.suppressMouseUntil) return;
        this.handlePointerUp();
    }

    private onTouchStart(e: EventTouch): void {
        if (typeof performance !== 'undefined') this.suppressMouseUntil = performance.now() + 360;
        const p = e.getUILocation();
        this.handlePointerDownAt(p.x, p.y);
    }

    private onTouchEnd(_e: EventTouch): void {
        this.handlePointerUp();
    }

    private handlePointerDownAt(uiX: number, uiY: number): void {
        if (!this.engine) return;
        const pt = this.toSourcePoint(uiX, uiY);
        for (const b of this.activeButtons) {
            if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
                if (b.id === 'start' || b.id === 'restart') this.startGame();
                else if (b.id === 'home') this.goHome();
                return;
            }
        }
        if (this.screenState === 'playing') {
            this.engine.handlePointerDown();
        }
    }

    private handlePointerUp(): void {
        if (this.engine && this.screenState === 'playing') {
            this.engine.handlePointerUp();
        }
    }

    private startGame(): void {
        if (!this.engine) return;
        this.engine.reset();
        this.screenState = 'playing';
    }

    private loadBestScore(): number {
        try {
            const raw = sys.localStorage.getItem(this.bestScoreKey);
            const v = raw ? Number(raw) : 0;
            if (!Number.isFinite(v) || v < 0) return 0;
            return Math.floor(v);
        } catch {
            return 0;
        }
    }

    private saveBestScore(v: number): void {
        try {
            sys.localStorage.setItem(this.bestScoreKey, `${Math.max(0, Math.floor(v))}`);
        } catch {
            // ignore storage failures in preview environments
        }
    }

    private goHome(): void {
        this.screenState = 'menu';
    }

    private syncCanvasSize(force: boolean): void {
        if (!this.canvasTf) return;
        const displayW = Math.max(1, Math.round(this.canvasTf.contentSize.width));
        const displayH = Math.max(1, Math.round(this.canvasTf.contentSize.height));

        const virtualW = this.baseVirtualW;
        const virtualH = (virtualW * displayH) / displayW;

        if (!force && displayW === this.displayW && displayH === this.displayH) return;
        this.displayW = displayW;
        this.displayH = displayH;
        this.canvasW = virtualW;
        this.canvasH = Math.max(640, virtualH);
        this.halfW = this.canvasW * 0.5;
        this.halfH = this.canvasH * 0.5;

        const scaleX = this.displayW / this.canvasW;
        const scaleY = this.displayH / this.canvasH;
        for (const n of [this.drawNode, this.uiTextRoot]) {
            const tf = n?.getComponent(UITransform);
            if (tf) tf.setContentSize(this.canvasW, this.canvasH);
            if (n) n.setScale(scaleX, scaleY, 1);
        }
        if (this.engine) this.engine.resize(this.canvasW, this.canvasH);
    }

    private toSourcePoint(uiX: number, uiY: number): { x: number; y: number } {
        const drawTf = this.drawNode?.getComponent(UITransform);
        if (drawTf) {
            this.tmpPoint.set(uiX, uiY, 0);
            const local = drawTf.convertToNodeSpaceAR(this.tmpPoint);
            return {
                x: local.x + this.halfW,
                y: this.halfH - local.y,
            };
        }
        const visible = view.getVisibleSize();
        const localX = (uiX - visible.width * 0.5) * (this.canvasW / Math.max(1, visible.width));
        const localY = (uiY - visible.height * 0.5) * (this.canvasH / Math.max(1, visible.height));
        return {
            x: localX + this.halfW,
            y: this.halfH - localY,
        };
    }

    private sx(x: number): number { return x - this.halfW; }
    private sy(y: number): number { return this.halfH - y; }

    private fill(g: Graphics, r: number, gr: number, b: number, a = 255): void {
        this.tmpColor.set(r, gr, b, a);
        g.fillColor = this.tmpColor;
    }

    private stroke(g: Graphics, r: number, gr: number, b: number, a = 255): void {
        this.tmpColor.set(r, gr, b, a);
        g.strokeColor = this.tmpColor;
    }

    private cssColor(css: string, alphaMul = 1): Color {
        const key = `${css}|${alphaMul}`;
        const cached = this.colorCache[key];
        if (cached) return cached;
        const s = (css || '').trim();
        let r = 255; let g = 255; let b = 255; let a = 1;
        if (s.length > 0 && s[0] === '#') {
            let hex = s.slice(1);
            if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
            if (hex.length >= 6) {
                r = parseInt(hex.slice(0, 2), 16) || 0;
                g = parseInt(hex.slice(2, 4), 16) || 0;
                b = parseInt(hex.slice(4, 6), 16) || 0;
                if (hex.length >= 8) a = (parseInt(hex.slice(6, 8), 16) || 255) / 255;
            }
        } else if (/^rgba?\(/i.test(s)) {
            const nums = s.replace(/[rgba()\s]/gi, '').split(',').map((n) => Number(n));
            r = nums[0] ?? 255;
            g = nums[1] ?? 255;
            b = nums[2] ?? 255;
            a = nums.length > 3 ? (nums[3] ?? 1) : 1;
        } else if (/^hsla?\(/i.test(s)) {
            const raw = s.replace(/[hsla()\s]/gi, '').split(',');
            const h = Number(raw[0] ?? 0);
            const sat = this.percentToUnit(raw[1] ?? '100');
            const lig = this.percentToUnit(raw[2] ?? '50');
            a = raw.length > 3 ? Number(raw[3]) || 1 : 1;
            const rgb = this.hslToRgb(h, sat, lig);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
        } else if (s === 'white') {
            r = g = b = 255;
        } else if (s === 'black') {
            r = g = b = 0;
        }
        const c = new Color(
            this.clamp255(r),
            this.clamp255(g),
            this.clamp255(b),
            this.clamp255(Math.round(255 * a * alphaMul)),
        );
        this.colorCache[key] = c;
        return c;
    }

    private percentToUnit(s: string): number {
        const v = String(s).trim();
        if (v.length > 0 && v[v.length - 1] === '%') return (Number(v.slice(0, -1)) || 0) / 100;
        return Number(v) || 0;
    }

    private hslToRgb(h: number, s: number, l: number): [number, number, number] {
        const hh = (((h % 360) + 360) % 360) / 360;
        if (s <= 0) {
            const v = Math.round(l * 255);
            return [v, v, v];
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue = (t: number): number => {
            let tt = t;
            if (tt < 0) tt += 1;
            if (tt > 1) tt -= 1;
            if (tt < 1 / 6) return p + (q - p) * 6 * tt;
            if (tt < 1 / 2) return q;
            if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
            return p;
        };
        return [
            Math.round(hue(hh + 1 / 3) * 255),
            Math.round(hue(hh) * 255),
            Math.round(hue(hh - 1 / 3) * 255),
        ];
    }

    private clamp255(v: number): number {
        return Math.max(0, Math.min(255, Math.round(v)));
    }

    private render(): void {
        const g = this.g;
        const engine = this.engine;
        if (!g || !engine) return;
        const s = engine.state;
        this.activeButtons = [];
        g.clear();
        if (this.canvasAdapter && this.sourceRenderer) {
            this.canvasAdapter.attach(g, this.canvasW, this.canvasH);
            this.canvasAdapter.beginFrame();
            this.sourceRenderer.draw(s);
            if (this.screenState === 'playing') this.renderSourceTextCommands(this.canvasAdapter.getTextCommands());
            else this.clearSourceTextPool();
        } else {
            this.drawBackground(g, s);
            this.drawEntities(g, s);
            this.drawNinja(g, s);
            this.drawUiBars(g, s);
        }
        this.updateLabels(s, this.screenState);

        if (this.screenState === 'menu') this.drawMenuOverlay(g, s);
        if (this.screenState === 'gameover') this.drawGameOverOverlay(g, s);
    }

    private renderSourceTextCommands(cmds: AdapterTextCommand[]): void {
        let used = 0;
        for (const cmd of cmds) {
            const fontSize = this.fontSizeFromCss(cmd.font);
            if (cmd.shadowBlur > 0) {
                const shadow = this.getSourceTextLabel(used++);
                this.applyTextToLabel(shadow, cmd, fontSize, true);
                shadow.node.setSiblingIndex(used - 1);
            }

            const lb = this.getSourceTextLabel(used++);
            this.applyTextToLabel(lb, cmd, fontSize, false);
            lb.node.setSiblingIndex(used - 1);
        }
        for (let i = used; i < this.sourceTextPool.length; i++) {
            const lb = this.sourceTextPool[i];
            lb.string = '';
            this.upsertOutline(lb, null, 0);
        }
    }

    private applyTextToLabel(lb: Label, cmd: AdapterTextCommand, fontSize: number, shadowOnly: boolean): void {
        const tf = lb.node.getComponent(UITransform);
        if (tf) {
            tf.setContentSize(this.canvasW, Math.max(40, Math.round(fontSize * 1.8)));
            let ax = 0;
            if (cmd.textAlign === 'center') ax = 0.5;
            else if (cmd.textAlign === 'right' || cmd.textAlign === 'end') ax = 1;
            tf.setAnchorPoint(ax, 1);
        }

        lb.node.setPosition(
            cmd.x,
            cmd.y + fontSize * 0.8 + (shadowOnly ? -cmd.shadowOffsetY : 0),
            0,
        );
        lb.string = cmd.text;
        lb.fontSize = fontSize;
        lb.lineHeight = Math.round(fontSize * 1.2);
        if (cmd.textAlign === 'center') lb.horizontalAlign = HorizontalTextAlignment.CENTER;
        else if (cmd.textAlign === 'right' || cmd.textAlign === 'end') lb.horizontalAlign = HorizontalTextAlignment.RIGHT;
        else lb.horizontalAlign = HorizontalTextAlignment.LEFT;
        lb.verticalAlign = VerticalTextAlignment.TOP;

        if (shadowOnly) {
            lb.color = this.cssColor(cmd.shadowColor, cmd.alpha * 0.8);
            this.upsertOutline(lb, null, 0);
            return;
        }

        if (cmd.kind === 'stroke') {
            lb.color = new Color(255, 255, 255, 0);
            this.upsertOutline(lb, this.cssColor(cmd.color, cmd.alpha), cmd.lineWidth);
        } else {
            lb.color = this.cssColor(cmd.color, cmd.alpha);
            this.upsertOutline(lb, null, 0);
        }
    }

    private getSourceTextLabel(index: number): Label {
        while (this.sourceTextPool.length <= index) {
            const lb = this.newLabel(`SourceText${this.sourceTextPool.length}`, 18, HorizontalTextAlignment.LEFT, VerticalTextAlignment.CENTER);
            this.sourceTextPool.push(lb);
        }
        return this.sourceTextPool[index];
    }

    private upsertOutline(lb: Label, color: Color | null, width: number): void {
        let outline = lb.getComponent(LabelOutline);
        if (!color || width <= 0) {
            if (outline) outline.enabled = false;
            return;
        }
        if (!outline) outline = lb.addComponent(LabelOutline);
        outline.enabled = true;
        outline.color = color;
        outline.width = Math.max(1, Math.min(8, Math.round(width)));
    }

    private clearSourceTextPool(): void {
        for (let i = 0; i < this.sourceTextPool.length; i++) {
            const lb = this.sourceTextPool[i];
            lb.string = '';
            this.upsertOutline(lb, null, 0);
        }
    }

    private fontSizeFromCss(font: string): number {
        const m = /(\d+(?:\.\d+)?)px/i.exec(font || '');
        if (!m) return 18;
        const v = Number(m[1]) || 18;
        return Math.max(10, Math.min(72, Math.round(v)));
    }

    private drawBackground(g: Graphics, s: GameState): void {
        // Simplified Cocos renderer for source game validation (logic-first phase)
        const huePulse = Math.sin(s.score * 0.01) * 0.5 + 0.5;
        const bgTop: [number, number, number] = s.isFever ? [80, 10, 70] : [10, 14, 26];
        const bgBot: [number, number, number] = s.isFever ? [50, 18, 80] : [8, 8, 14];
        this.fill(g, bgBot[0], bgBot[1], bgBot[2], 255);
        g.rect(-this.halfW, -this.halfH, this.canvasW, this.canvasH);
        g.fill();
        this.fill(g, bgTop[0], bgTop[1], bgTop[2], 220);
        g.rect(-this.halfW, 0, this.canvasW, this.halfH);
        g.fill();
        this.fill(g, 140, 180 + Math.round(huePulse * 30), 255, 20);
        g.circle(0, this.halfH - 140, 140);
        g.fill();

        // scrolling center guides
        this.stroke(g, s.isFever ? 255 : 90, s.isFever ? 220 : 140, s.isFever ? 80 : 220, 70);
        g.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) {
            const x = this.sx(this.canvasW * 0.5 + i * 36);
            g.moveTo(x, -this.halfH);
            g.lineTo(x, this.halfH);
        }
        g.stroke();

        // walls
        this.fill(g, 28, 28, 36, 240);
        g.rect(this.sx(0), -this.halfH, WALL_WIDTH, this.canvasH);
        g.fill();
        g.rect(this.sx(this.canvasW - WALL_WIDTH), -this.halfH, WALL_WIDTH, this.canvasH);
        g.fill();
        this.fill(g, 70, 90, 120, 120);
        g.rect(this.sx(WALL_WIDTH - 2), -this.halfH, 2, this.canvasH);
        g.fill();
        g.rect(this.sx(this.canvasW - WALL_WIDTH), -this.halfH, 2, this.canvasH);
        g.fill();
    }

    private drawEntities(g: Graphics, s: GameState): void {
        // Trail
        for (const t of s.trail) {
            const alpha = Math.max(0, Math.min(1, t.life));
            const x = this.sx(t.x);
            const y = this.sy(t.y + NINJA_SIZE);
            this.fill(g, t.isDashing || s.isFever ? 70 : 35, t.isDashing || s.isFever ? 200 : 45, t.isDashing || s.isFever ? 255 : 60, Math.round(alpha * 120));
            g.rect(x, y - NINJA_SIZE, NINJA_SIZE, NINJA_SIZE);
            g.fill();
        }

        // Entities
        for (const ent of s.entities) {
            this.drawEntity(g, ent);
        }

        // Particles
        for (const p of s.particles) {
            g.fillColor = this.cssColor(p.color, Math.max(0, Math.min(1, p.life / Math.max(0.0001, p.maxLife))));
            g.circle(this.sx(p.x), this.sy(p.y), Math.max(1, p.size));
            g.fill();
        }
    }

    private drawEntity(g: Graphics, ent: Entity): void {
        const x = this.sx(ent.x);
        const y = this.sy(ent.y + ent.height);
        if (ent.type === 'laser') {
            const gy = this.sy(ent.y + ent.height);
            const h = ent.height;
            this.fill(g, 230, 70, 80, 220);
            const gapX = ent.gapX ?? 0;
            const gapW = ent.gapWidth ?? 0;
            g.rect(this.sx(WALL_WIDTH), gy, Math.max(0, gapX - WALL_WIDTH), h);
            g.fill();
            const rightX = gapX + gapW;
            g.rect(this.sx(rightX), gy, Math.max(0, this.canvasW - WALL_WIDTH - rightX), h);
            g.fill();
            return;
        }

        if (ent.type === 'coin') {
            this.fill(g, 245, 170, 24, 235); g.circle(this.sx(ent.x + ent.width * 0.5), this.sy(ent.y + ent.height * 0.5), ent.width * 0.5); g.fill();
            this.fill(g, 255, 210, 80, 190); g.circle(this.sx(ent.x + ent.width * 0.5), this.sy(ent.y + ent.height * 0.5), ent.width * 0.3); g.fill();
            return;
        }

        if (ent.type === 'heart') {
            const cx = this.sx(ent.x + ent.width * 0.5);
            const cy = this.sy(ent.y + ent.height * 0.5);
            this.fill(g, 235, 68, 90, 235);
            g.circle(cx - 5, cy + 3, 5); g.fill();
            g.circle(cx + 5, cy + 3, 5); g.fill();
            g.moveTo(cx - 10, cy + 4);
            g.lineTo(cx, cy - 10);
            g.lineTo(cx + 10, cy + 4);
            g.close();
            g.fill();
            return;
        }

        if (ent.type === 'magnet') {
            this.fill(g, 170, 85, 247, 220); g.rect(x, y, ent.width, ent.height); g.fill();
            this.stroke(g, 220, 180, 255, 210); g.lineWidth = 1.2; g.rect(x, y, ent.width, ent.height); g.stroke();
            return;
        }

        if (ent.type === 'shield') {
            this.fill(g, 59, 130, 246, 220); g.rect(x, y, ent.width, ent.height); g.fill();
            this.stroke(g, 170, 210, 255, 210); g.lineWidth = 1.2; g.rect(x, y, ent.width, ent.height); g.stroke();
            return;
        }

        if (ent.type === 'spike') {
            this.fill(g, 239, 68, 68, 235);
            if (ent.side === 'left') {
                g.moveTo(x, y);
                g.lineTo(x + ent.width, y + ent.height * 0.5);
                g.lineTo(x, y + ent.height);
            } else {
                g.moveTo(x + ent.width, y);
                g.lineTo(x, y + ent.height * 0.5);
                g.lineTo(x + ent.width, y + ent.height);
            }
            g.close();
            g.fill();
            return;
        }

        if (ent.type === 'shuriken') {
            const cx = this.sx(ent.x + ent.width * 0.5);
            const cy = this.sy(ent.y + ent.height * 0.5);
            this.stroke(g, 190, 200, 210, 230);
            g.lineWidth = 2;
            g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy);
            g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10);
            g.stroke();
            this.fill(g, 120, 130, 150, 220);
            g.circle(cx, cy, 3); g.fill();
            return;
        }

        if (ent.type === 'missile') {
            this.fill(g, 220, 50, 50, 230); g.rect(x, y, ent.width, ent.height); g.fill();
            this.fill(g, 250, 140, 40, 170); g.rect(x + 3, y - 6, ent.width - 6, 6); g.fill();
            return;
        }

        this.fill(g, 255, 255, 255, 180);
        g.rect(x, y, ent.width, ent.height);
        g.fill();
    }

    private drawNinja(g: Graphics, s: GameState): void {
        const n = s.ninja;
        if (s.status === 'gameover') return;
        const x = this.sx(n.x);
        const y = this.sy(n.y + n.yOffset + NINJA_SIZE);
        if (n.hasShield) {
            this.fill(g, 59, 130, 246, 45);
            g.circle(this.sx(n.x + NINJA_SIZE * 0.5), this.sy(n.y + n.yOffset + NINJA_SIZE * 0.5), NINJA_SIZE * 0.9);
            g.fill();
            this.stroke(g, 110, 180, 255, 160);
            g.lineWidth = 1.5;
            g.circle(this.sx(n.x + NINJA_SIZE * 0.5), this.sy(n.y + n.yOffset + NINJA_SIZE * 0.5), NINJA_SIZE * 0.9);
            g.stroke();
        }
        if (n.isDashing || s.isFever) {
            this.fill(g, s.isFever ? 250 : 40, s.isFever ? 220 : 210, s.isFever ? 80 : 255, 60);
            g.rect(x - 2, y - 2, NINJA_SIZE + 4, NINJA_SIZE + 4);
            g.fill();
        }
        this.fill(g, 17, 24, 39, n.invincibleTimer > 0 ? 150 : 240);
        g.rect(x, y, NINJA_SIZE, NINJA_SIZE);
        g.fill();
        this.fill(g, 239, 68, 68, 240);
        g.rect(x, y + NINJA_SIZE - 12, NINJA_SIZE, 6);
        g.fill();

        // headband tails
        this.fill(g, 239, 68, 68, 220);
        if (n.side === 'left') {
            g.moveTo(x + NINJA_SIZE, y + NINJA_SIZE - 8);
            g.lineTo(x + NINJA_SIZE + 10, y + NINJA_SIZE - 4);
            g.lineTo(x + NINJA_SIZE + 2, y + NINJA_SIZE - 14);
        } else {
            g.moveTo(x, y + NINJA_SIZE - 8);
            g.lineTo(x - 10, y + NINJA_SIZE - 4);
            g.lineTo(x - 2, y + NINJA_SIZE - 14);
        }
        g.close();
        g.fill();

        this.fill(g, 255, 255, 255, 245);
        if (n.side === 'right') {
            g.rect(x + 2, y + NINJA_SIZE - 18, 4, 4); g.fill();
            g.rect(x + 10, y + NINJA_SIZE - 18, 4, 4); g.fill();
        } else {
            g.rect(x + NINJA_SIZE - 6, y + NINJA_SIZE - 18, 4, 4); g.fill();
            g.rect(x + NINJA_SIZE - 14, y + NINJA_SIZE - 18, 4, 4); g.fill();
        }
    }

    private drawUiBars(g: Graphics, s: GameState): void {
        // top chip background
        this.fill(g, 10, 12, 18, 175);
        g.rect(-this.halfW + 10, this.halfH - 74, this.canvasW - 20, 64);
        g.fill();
        this.stroke(g, 80, 120, 180, 120);
        g.lineWidth = 1.4;
        g.rect(-this.halfW + 10, this.halfH - 74, this.canvasW - 20, 64);
        g.stroke();

        // energy bar
        const ex = WALL_WIDTH + 10;
        const ey = 40;
        const ew = 112;
        this.fill(g, 0, 0, 0, 140);
        g.rect(this.sx(ex), this.sy(ey + 10), ew, 8);
        g.fill();
        const er = Math.max(0, Math.min(1, s.ninja.energy / ENERGY_MAX));
        let ec: [number, number, number] = [6, 182, 212];
        if (s.ninja.energy <= 30) ec = [239, 68, 68];
        else if (s.ninja.energy <= 80) ec = [52, 211, 153];
        this.fill(g, ec[0], ec[1], ec[2], 240);
        g.rect(this.sx(ex), this.sy(ey + 10), ew * er, 8);
        g.fill();

        // health hearts
        for (let i = 0; i < MAX_HEALTH; i++) {
            const hx = this.canvasW - WALL_WIDTH - 20 - (MAX_HEALTH - i) * 26;
            const hy = 26;
            if (i < s.ninja.health) {
                this.fill(g, 239, 68, 68, 235);
            } else {
                this.fill(g, 100, 110, 130, 120);
            }
            const cx = this.sx(hx + 10);
            const cy = this.sy(hy + 10);
            g.circle(cx - 4, cy + 2, 4); g.fill();
            g.circle(cx + 4, cy + 2, 4); g.fill();
            g.moveTo(cx - 8, cy + 2);
            g.lineTo(cx, cy - 8);
            g.lineTo(cx + 8, cy + 2);
            g.close();
            g.fill();
        }

        // combo/fever bar
        const comboBarW = 76;
        const comboRatio = s.isFever
            ? Math.max(0, Math.min(1, s.feverTimer / 5000))
            : Math.max(0, Math.min(1, s.combo / FEVER_COMBO_THRESHOLD));
        this.fill(g, 0, 0, 0, 140);
        g.rect(this.sx(this.canvasW - WALL_WIDTH - 10 - comboBarW), this.sy(96), comboBarW, 6);
        g.fill();
        const cc: [number, number, number] = s.isFever ? [253, 224, 71] : (s.combo >= FEVER_COMBO_THRESHOLD - 3 ? [253, 224, 71] : [56, 189, 248]);
        this.fill(g, cc[0], cc[1], cc[2], 240);
        g.rect(this.sx(this.canvasW - WALL_WIDTH - 10 - comboBarW), this.sy(96), comboBarW * comboRatio, 6);
        g.fill();
    }

    private drawMenuOverlay(g: Graphics, s: GameState): void {
        this.fill(g, 0, 0, 0, 204);
        g.rect(-this.halfW, -this.halfH, this.canvasW, this.canvasH);
        g.fill();

        const cx = this.canvasW * 0.5;
        const vh = this.canvasH;
        const cardW = Math.min(320, this.canvasW - 44);
        const cardX = cx - cardW * 0.5;
        const cardY = vh * 0.36;
        const cardH = vh * 0.34;
        const titleY = vh * 0.16;
        const startY = vh * 0.79;

        // Title glow
        this.fill(g, 239, 68, 68, 24);
        this.fillRoundedRect(g, cx - 180, titleY - 26, 360, 56, 28);

        // Menu card
        this.fill(g, 255, 255, 255, 14);
        this.fillRoundedRect(g, cardX, cardY, cardW, cardH, 24);
        this.stroke(g, 255, 255, 255, 40);
        g.lineWidth = 1.4;
        this.strokeRoundedRect(g, cardX, cardY, cardW, cardH, 24);
        this.fill(g, 255, 255, 255, 10);
        this.fillRoundedRect(g, cardX + 1, cardY + 1, cardW - 2, 48, 22);

        const iconRows = [
            [245, 158, 11],
            [34, 211, 238],
            [168, 85, 247],
            [239, 68, 68],
        ];
        for (let i = 0; i < 4; i++) {
            const iy = cardY + 64 + i * 60;
            const c = iconRows[i];
            this.fill(g, c[0], c[1], c[2], 38);
            this.fillRoundedRect(g, cardX + 16, iy, 28, 28, 10);
            this.stroke(g, c[0], c[1], c[2], 120);
            g.lineWidth = 1.2;
            this.strokeRoundedRect(g, cardX + 16, iy, 28, 28, 10);
        }

        // Start button
        const btnW = 300;
        const btnH = 56;
        const bx = cx - btnW * 0.5;
        const by = startY;
        this.fill(g, 255, 255, 255, 246);
        this.fillRoundedRect(g, bx, by, btnW, btnH, 28);
        this.fill(g, 245, 245, 245, 160);
        this.fillRoundedRect(g, bx + 2, by + 2, btnW - 4, 24, 20);
        this.stroke(g, 255, 255, 255, 255);
        g.lineWidth = 1.8;
        this.strokeRoundedRect(g, bx, by, btnW, btnH, 28);
        this.activeButtons.push({ id: 'start', x: bx, y: by, w: btnW, h: btnH });

        this.drawNinja(g, {
            ...s,
            ninja: {
                ...s.ninja,
                x: cx - NINJA_SIZE * 0.5,
                y: vh * 0.3,
                yOffset: 0,
                side: 'right',
                vx: 0,
                isDashing: false,
                invincibleTimer: 0,
            },
        });
    }

    private drawGameOverOverlay(g: Graphics, s: GameState): void {
        this.fill(g, 0, 0, 0, 204);
        g.rect(-this.halfW, -this.halfH, this.canvasW, this.canvasH);
        g.fill();

        const vh = this.canvasH;
        const panelW = 300;
        const panelX = this.canvasW * 0.5 - panelW * 0.5;

        // score card
        const cardY = vh * 0.31;
        const cardH = vh * 0.29;
        this.fill(g, 255, 255, 255, 14);
        this.fillRoundedRect(g, panelX, cardY, panelW, cardH, 24);
        this.stroke(g, 255, 255, 255, 32);
        g.lineWidth = 1.3;
        this.strokeRoundedRect(g, panelX, cardY, panelW, cardH, 24);
        const isNewRecord = Math.floor(s.score) > 0 && Math.floor(s.score) >= this.bestScore;
        if (isNewRecord) {
            this.fill(g, 214, 158, 32, 160);
            this.fillRoundedRect(g, panelX, cardY, panelW, 22, 11);
        }

        // trophy row
        const trophyY = cardY + 174;
        this.fill(g, 250, 204, 21, 22);
        this.fillRoundedRect(g, panelX + 34, trophyY, panelW - 68, 42, 16);
        this.stroke(g, 250, 204, 21, 60);
        g.lineWidth = 1.2;
        this.strokeRoundedRect(g, panelX + 34, trophyY, panelW - 68, 42, 16);

        // buttons
        const btnW = panelW;
        const btnH1 = 56;
        const btnH2 = 48;
        const bx = panelX;
        const by1 = vh * 0.66;
        const by2 = by1 + btnH1 + 16;
        this.fill(g, 255, 255, 255, 246);
        this.fillRoundedRect(g, bx, by1, btnW, btnH1, 28);
        this.stroke(g, 255, 255, 255, 255);
        g.lineWidth = 1.8;
        this.strokeRoundedRect(g, bx, by1, btnW, btnH1, 28);
        this.activeButtons.push({ id: 'restart', x: bx, y: by1, w: btnW, h: btnH1 });
        this.fill(g, 255, 255, 255, 26);
        this.fillRoundedRect(g, bx, by2, btnW, btnH2, 24);
        this.stroke(g, 255, 255, 255, 44);
        g.lineWidth = 1.4;
        this.strokeRoundedRect(g, bx, by2, btnW, btnH2, 24);
        this.activeButtons.push({ id: 'home', x: bx, y: by2, w: btnW, h: btnH2 });
    }

    private fillRoundedRect(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
        this.roundedRectPath(g, x, y, w, h, r);
        g.fill();
    }

    private strokeRoundedRect(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
        this.roundedRectPath(g, x, y, w, h, r);
        g.stroke();
    }

    private roundedRectPath(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
        const radius = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
        const left = this.sx(x);
        const bottom = this.sy(y + h);

        const anyG = g as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
        if (typeof anyG.roundRect === 'function') {
            anyG.roundRect(left, bottom, w, h, radius);
            return;
        }

        g.rect(left, bottom, w, h);
    }

    private updateLabels(s: GameState, screenState: 'menu' | 'playing' | 'gameover'): void {
        const set = (
            lb: Label | null,
            x: number,
            y: number,
            w: number,
            h: number,
            text: string,
            color: Color,
            opts?: {
                ax?: number;
                ay?: number;
                hAlign?: HorizontalTextAlignment;
                vAlign?: VerticalTextAlignment;
                fontSize?: number;
            },
        ): void => {
            if (!lb) return;
            const tf = lb.node.getComponent(UITransform);
            if (tf) {
                tf.setAnchorPoint(opts?.ax ?? 0.5, opts?.ay ?? 0.5);
                tf.setContentSize(w, h);
            }
            if (opts?.fontSize) {
                lb.fontSize = opts.fontSize;
                lb.lineHeight = Math.round(opts.fontSize * 1.2);
            }
            if (opts?.hAlign !== undefined) lb.horizontalAlign = opts.hAlign;
            if (opts?.vAlign !== undefined) lb.verticalAlign = opts.vAlign;
            lb.node.setPosition(this.sx(x), this.sy(y), 0);
            lb.string = text;
            lb.color = color;
        };

        const managed = [
            this.titleLabel,
            this.subLabel,
            this.primaryBtnLabel,
            this.secondaryBtnLabel,
            this.tertiaryBtnLabel,
            this.centerBannerLabel,
            this.scoreLabel,
            this.hudLeftLabel,
            this.hudRightLabel,
        ];
        for (const lb of managed) {
            if (lb) lb.string = '';
        }

        if (screenState === 'menu') {
            const cx = this.canvasW * 0.5;
            const vh = this.canvasH;
            const cardW = Math.min(320, this.canvasW - 44);
            const cardX = cx - cardW * 0.5;
            const textX = cardX + 54;
            const titleY = vh * 0.16;
            const subY = titleY + 50;
            const cardY = vh * 0.36;
            const startY = vh * 0.79;

            set(this.titleLabel, cx, titleY, this.canvasW - 60, 72, '忍者突袭', new Color(255, 174, 72, 255), { fontSize: 46 });
            set(this.subLabel, cx, subY, this.canvasW - 120, 24, '点击切换方向，按住进入冲刺', new Color(248, 113, 113, 225), { fontSize: 14 });
            set(this.centerBannerLabel, cx, cardY + 14, 220, 20, '操作说明', new Color(235, 240, 248, 235), { fontSize: 12 });

            set(this.scoreLabel, textX, cardY + 64, this.canvasW - 120, 44, '点击切换左右\n可在空中即时反向', new Color(236, 240, 248, 235), {
                ax: 0, ay: 0.5, hAlign: HorizontalTextAlignment.LEFT, fontSize: 13,
            });
            set(this.hudLeftLabel, textX, cardY + 124, this.canvasW - 120, 44, '按住冲刺\n冲刺期间无敌并消耗能量', new Color(236, 240, 248, 235), {
                ax: 0, ay: 0.5, hAlign: HorizontalTextAlignment.LEFT, fontSize: 13,
            });
            set(this.hudRightLabel, textX, cardY + 184, this.canvasW - 120, 44, '道具效果\n磁铁、护盾与生命回复', new Color(236, 240, 248, 235), {
                ax: 0, ay: 0.5, hAlign: HorizontalTextAlignment.LEFT, fontSize: 13,
            });
            set(this.secondaryBtnLabel, textX, cardY + 244, this.canvasW - 120, 44, '狂热模式\n连击达到 15 次触发', new Color(236, 240, 248, 235), {
                ax: 0, ay: 0.5, hAlign: HorizontalTextAlignment.LEFT, fontSize: 13,
            });
            set(this.primaryBtnLabel, cx, startY + 28, 300, 44, '开始游戏', new Color(18, 18, 22, 255), { fontSize: 22 });
        } else if (screenState === 'gameover') {
            const isNewRecord = Math.floor(s.score) > 0 && Math.floor(s.score) >= this.bestScore;
            const cx = this.canvasW * 0.5;
            const vh = this.canvasH;
            const cardY = vh * 0.31;
            const by1 = vh * 0.66;

            set(this.titleLabel, cx, vh * 0.23, this.canvasW - 80, 64, '游戏结束', new Color(248, 113, 113, 255), { fontSize: 42 });
            if (isNewRecord) {
                set(this.tertiaryBtnLabel, cx, cardY + 12, 220, 20, '新纪录', new Color(255, 244, 200, 240), { fontSize: 11 });
            }
            set(this.subLabel, cx, cardY + 64, 200, 20, '得分', new Color(255, 255, 255, 150), { fontSize: 12 });
            set(this.scoreLabel, cx, cardY + 114, 240, 60, `${Math.floor(s.score)}`, new Color(255, 255, 255, 255), { fontSize: 52 });
            // Place high-score text at the vertical center of the gold row (trophyY + 42 / 2).
            set(this.hudLeftLabel, cx, cardY + 195, 232, 30, `最高分 ${this.bestScore}`, new Color(250, 204, 21, 240), { fontSize: 16 });
            set(this.primaryBtnLabel, cx, by1 + 28, 300, 44, '再来一局', new Color(18, 18, 22, 255), { fontSize: 20 });
            // Secondary button center: by2 + btnH2 / 2 = (by1 + 56 + 16) + 24 = by1 + 96.
            set(this.secondaryBtnLabel, cx, by1 + 96, 300, 40, '返回主菜单', new Color(235, 240, 248, 245), { fontSize: 16 });
        }
    }
}
