import { Color, Graphics } from 'cc';

type TextAlignLike = 'left' | 'right' | 'center' | 'start' | 'end';

interface Mat2D {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

interface AdapterState {
    m: Mat2D;
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    globalAlpha: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetY: number;
    font: string;
    textAlign: TextAlignLike;
}

interface PathSubpath {
    points: Array<{ x: number; y: number }>;
    closed: boolean;
}

export interface AdapterTextCommand {
    kind: 'fill' | 'stroke';
    text: string;
    x: number; // local cocos coords
    y: number; // local cocos coords
    color: string;
    alpha: number;
    font: string;
    textAlign: TextAlignLike;
    lineWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetY: number;
    order: number;
}

export interface Canvas2DLike {
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    globalAlpha: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetY: number;
    font: string;
    textAlign: TextAlignLike;
    save(): void;
    restore(): void;
    translate(x: number, y: number): void;
    rotate(rad: number): void;
    scale(x: number, y: number): void;
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void;
    fill(): void;
    stroke(): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number): void;
    strokeText(text: string, x: number, y: number): void;
}

export class CocosCanvas2DAdapter implements Canvas2DLike {
    private g: Graphics | null = null;
    private width = 0;
    private height = 0;
    private state: AdapterState = this.defaultState();
    private stack: AdapterState[] = [];
    private path: PathSubpath[] = [];
    private currentSub: PathSubpath | null = null;
    private tmpColor = new Color();
    private textCommands: AdapterTextCommand[] = [];
    private textOrder = 0;

    attach(graphics: Graphics, width: number, height: number): void {
        this.g = graphics;
        this.width = width;
        this.height = height;
    }

    beginFrame(): void {
        this.stack.length = 0;
        this.state = this.defaultState();
        this.path = [];
        this.currentSub = null;
        this.textCommands = [];
        this.textOrder = 0;
    }

    getTextCommands(): AdapterTextCommand[] {
        return this.textCommands;
    }

    get fillStyle(): string { return this.state.fillStyle; }
    set fillStyle(v: string) { this.state.fillStyle = String(v); }

    get strokeStyle(): string { return this.state.strokeStyle; }
    set strokeStyle(v: string) { this.state.strokeStyle = String(v); }

    get lineWidth(): number { return this.state.lineWidth; }
    set lineWidth(v: number) { this.state.lineWidth = Number(v) || 1; }

    get globalAlpha(): number { return this.state.globalAlpha; }
    set globalAlpha(v: number) { this.state.globalAlpha = Math.max(0, Math.min(1, Number(v))); }

    get shadowColor(): string { return this.state.shadowColor; }
    set shadowColor(v: string) { this.state.shadowColor = String(v); }

    get shadowBlur(): number { return this.state.shadowBlur; }
    set shadowBlur(v: number) { this.state.shadowBlur = Number(v) || 0; }

    get shadowOffsetY(): number { return this.state.shadowOffsetY; }
    set shadowOffsetY(v: number) { this.state.shadowOffsetY = Number(v) || 0; }

    get font(): string { return this.state.font; }
    set font(v: string) { this.state.font = String(v); }

    get textAlign(): TextAlignLike { return this.state.textAlign; }
    set textAlign(v: TextAlignLike) { this.state.textAlign = v; }

    save(): void {
        this.stack.push({
            ...this.state,
            m: { ...this.state.m },
        });
    }

    restore(): void {
        const next = this.stack.pop();
        if (next) this.state = next;
    }

    translate(x: number, y: number): void {
        this.multiply({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
    }

    rotate(rad: number): void {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        this.multiply({ a: c, b: s, c: -s, d: c, e: 0, f: 0 });
    }

    scale(x: number, y: number): void {
        this.multiply({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
    }

    beginPath(): void {
        this.path = [];
        this.currentSub = null;
    }

    closePath(): void {
        if (this.currentSub) this.currentSub.closed = true;
    }

    moveTo(x: number, y: number): void {
        const p = this.transformToLocal(x, y);
        const sub: PathSubpath = { points: [p], closed: false };
        this.path.push(sub);
        this.currentSub = sub;
    }

    lineTo(x: number, y: number): void {
        const p = this.transformToLocal(x, y);
        if (!this.currentSub) {
            this.moveTo(x, y);
            return;
        }
        this.currentSub.points.push(p);
    }

    arc(x: number, y: number, r: number, start: number, end: number, ccw = false): void {
        const full = Math.PI * 2;
        let s = start;
        let e = end;
        if (!ccw && e < s) e += full;
        if (ccw && e > s) e -= full;
        let span = e - s;
        if (!ccw && span < 0) span += full;
        if (ccw && span > 0) span -= full;
        const absSpan = Math.abs(span);
        const steps = Math.max(10, Math.ceil(absSpan / (Math.PI / 12)));
        for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            const a = s + span * t;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) {
                if (!this.currentSub) this.moveTo(px, py);
                else this.lineTo(px, py);
            } else {
                this.lineTo(px, py);
            }
        }
    }

    fill(): void {
        const g = this.g;
        if (!g) return;
        const c = this.cloneColor(this.parseColor(this.state.fillStyle, this.state.globalAlpha));
        const shadow = this.cloneColor(this.parseColor(this.state.shadowColor, this.state.globalAlpha * 0.75));
        const hasShadow = this.state.shadowBlur > 0 && shadow.a > 0;
        for (const sub of this.path) {
            if (sub.points.length < 2) continue;
            if (hasShadow) {
                g.fillColor = shadow;
                this.traceSubPath(sub, 0, -this.state.shadowOffsetY);
                g.fill();
            }
            g.fillColor = c;
            this.traceSubPath(sub, 0, 0);
            g.fill();
        }
    }

    stroke(): void {
        const g = this.g;
        if (!g) return;
        const strokeColor = this.cloneColor(this.parseColor(this.state.strokeStyle, this.state.globalAlpha));
        const shadow = this.cloneColor(this.parseColor(this.state.shadowColor, this.state.globalAlpha * 0.75));
        const hasShadow = this.state.shadowBlur > 0 && shadow.a > 0;
        for (const sub of this.path) {
            if (sub.points.length < 2) continue;
            if (hasShadow) {
                g.lineWidth = this.state.lineWidth;
                g.strokeColor = shadow;
                this.traceSubPath(sub, 0, -this.state.shadowOffsetY);
                g.stroke();
            }
            g.lineWidth = this.state.lineWidth;
            g.strokeColor = strokeColor;
            this.traceSubPath(sub, 0, 0);
            g.stroke();
        }
    }

    fillRect(x: number, y: number, w: number, h: number): void {
        const pts = this.rectPoints(x, y, w, h);
        this.drawPoly(pts, true);
    }

    strokeRect(x: number, y: number, w: number, h: number): void {
        const pts = this.rectPoints(x, y, w, h);
        this.drawPoly(pts, false);
    }

    fillText(text: string, x: number, y: number): void {
        const p = this.transformToLocal(x, y);
        this.textCommands.push({
            kind: 'fill',
            text,
            x: p.x,
            y: p.y,
            color: this.state.fillStyle,
            alpha: this.state.globalAlpha,
            font: this.state.font,
            textAlign: this.state.textAlign,
            lineWidth: this.state.lineWidth,
            shadowColor: this.state.shadowColor,
            shadowBlur: this.state.shadowBlur,
            shadowOffsetY: this.state.shadowOffsetY,
            order: this.textOrder++,
        });
    }

    strokeText(text: string, x: number, y: number): void {
        const p = this.transformToLocal(x, y);
        this.textCommands.push({
            kind: 'stroke',
            text,
            x: p.x,
            y: p.y,
            color: this.state.strokeStyle,
            alpha: this.state.globalAlpha,
            font: this.state.font,
            textAlign: this.state.textAlign,
            lineWidth: this.state.lineWidth,
            shadowColor: this.state.shadowColor,
            shadowBlur: this.state.shadowBlur,
            shadowOffsetY: this.state.shadowOffsetY,
            order: this.textOrder++,
        });
    }

    private defaultState(): AdapterState {
        return {
            m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            globalAlpha: 1,
            shadowColor: 'rgba(0,0,0,0)',
            shadowBlur: 0,
            shadowOffsetY: 0,
            font: '16px sans-serif',
            textAlign: 'left',
        };
    }

    private multiply(rhs: Mat2D): void {
        const m = this.state.m;
        // Canvas 2D post-multiply: m = m * rhs
        this.state.m = {
            a: m.a * rhs.a + m.c * rhs.b,
            b: m.b * rhs.a + m.d * rhs.b,
            c: m.a * rhs.c + m.c * rhs.d,
            d: m.b * rhs.c + m.d * rhs.d,
            e: m.a * rhs.e + m.c * rhs.f + m.e,
            f: m.b * rhs.e + m.d * rhs.f + m.f,
        };
    }

    private transformToLocal(x: number, y: number): { x: number; y: number } {
        const m = this.state.m;
        const sx = m.a * x + m.c * y + m.e;
        const sy = m.b * x + m.d * y + m.f;
        // convert source canvas coords (top-left origin, y down) to cocos local (center origin, y up)
        return {
            x: sx - this.width * 0.5,
            y: this.height * 0.5 - sy,
        };
    }

    private rectPoints(x: number, y: number, w: number, h: number): Array<{ x: number; y: number }> {
        return [
            this.transformToLocal(x, y),
            this.transformToLocal(x + w, y),
            this.transformToLocal(x + w, y + h),
            this.transformToLocal(x, y + h),
        ];
    }

    private drawPoly(pts: Array<{ x: number; y: number }>, isFill: boolean): void {
        const g = this.g;
        if (!g || pts.length < 2) return;
        const shadow = this.cloneColor(this.parseColor(this.state.shadowColor, this.state.globalAlpha * 0.75));
        const hasShadow = this.state.shadowBlur > 0 && shadow.a > 0;

        if (hasShadow) {
            if (isFill) {
                g.fillColor = shadow;
            } else {
                g.lineWidth = this.state.lineWidth;
                g.strokeColor = shadow;
            }
            g.moveTo(pts[0].x, pts[0].y - this.state.shadowOffsetY);
            for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y - this.state.shadowOffsetY);
            g.close();
            if (isFill) g.fill();
            else g.stroke();
        }

        if (isFill) {
            g.fillColor = this.cloneColor(this.parseColor(this.state.fillStyle, this.state.globalAlpha));
        } else {
            g.lineWidth = this.state.lineWidth;
            g.strokeColor = this.cloneColor(this.parseColor(this.state.strokeStyle, this.state.globalAlpha));
        }
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.close();
        if (isFill) g.fill();
        else g.stroke();
    }

    private parseColor(style: string, alphaMul: number): Color {
        const s = (style || '').trim();
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
            r = rgb[0]; g = rgb[1]; b = rgb[2];
        } else if (s === 'white') {
            r = g = b = 255;
        } else if (s === 'black') {
            r = g = b = 0;
        }
        this.tmpColor.set(
            this.clamp255(r),
            this.clamp255(g),
            this.clamp255(b),
            this.clamp255(Math.round(255 * a * alphaMul)),
        );
        return this.tmpColor;
    }

    private cloneColor(c: Color): Color {
        return new Color(c.r, c.g, c.b, c.a);
    }

    private traceSubPath(sub: PathSubpath, offsetX: number, offsetY: number): void {
        const g = this.g;
        if (!g || sub.points.length < 2) return;
        g.moveTo(sub.points[0].x + offsetX, sub.points[0].y + offsetY);
        for (let i = 1; i < sub.points.length; i++) {
            g.lineTo(sub.points[i].x + offsetX, sub.points[i].y + offsetY);
        }
        if (sub.closed) g.close();
    }

    private percentToUnit(s: string): number {
        const v = String(s).trim();
        if (v.length > 0 && v[v.length - 1] === '%') return (Number(v.slice(0, -1)) || 0) / 100;
        return Number(v) || 0;
    }

    private clamp255(v: number): number {
        return Math.max(0, Math.min(255, Math.round(v)));
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
}
