import { Generator, TextFieldGenerator, TextFieldVerticalAlign } from "../generator";
import { Engine } from "../engine";
import { RectMesh } from "../mesh";
import { DisplayStatus, numberClamp } from '../utils';
import { RenderObject, OutViewportStatus } from "../render-object";
import { ViewportEvent } from "../viewport";
import { TextField } from "../textfield";
import * as glMatrix from "../../lib/gl-matrix.js";

const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;
const RATIO = window.devicePixelRatio;

export const enum ViewportRulerAxis {
	X = 1,
	Y = 2,
}

export interface ViewportRulerConfigInterface {
	unitMin?: number;			//最小单位
	unitMax?: number;			//最大单位
	axis?: ViewportRulerAxis;	//坐标轴
	pixelPerUnit?: number;		//每单位像素	像素
	largeTickStep?: number;		//多少刻度显示一个大刻度
	tickSizeMin?: number;		//小刻度尺寸	像素
	tickSizeMax?: number;		//大刻度尺寸	像素
	tickWidth?: number;			//刻度宽度		像素
	tickColor?: number[];		//刻度颜色
	fontSize?: number;			//字号
	fontColor?: number[];		//字颜色
	fontBorderWidth?: number;	//字边框宽度
	fontBorderColor?: number[];	//字边框颜色
}

export class ViewportRulerComponent {
	private _engine: Engine;
	private _gs: Generator[];
	private _tgs: TextFieldGenerator[];
	private _ticks: RenderObject[];		//刻度对象集合
	private _texts: TextField[];
	private _gIndex: number;

	private pixelPerUnit: number = 10;			//最小计量单位 等于多少像素
	private displayPosition: number = 30;		//显示的位置
	private largeTickStep: number = 10;			//多少刻度显示一个大刻度

	private tickSizeMin: number = 3;			//长刻度长度
	private tickSizeMax: number = 18;				//短刻度长度
	private tickWidth: number = 1;				//刻度的宽度
	private tickColor: number[] = [0,0,0,255];		//刻度的颜色

	private fontSize: number = 12;
	private fontColor: number[] = [0,0,0,255];
	private fontBorderWidth: number = 0;
	private fontBorderColor: number[] = [255,255,255,255];

	private unitMin: number = 0;
	private unitMax: number = 3000;

	private axis: ViewportRulerAxis = ViewportRulerAxis.X;
	private added: boolean = false;

	private scales: number[];
	private active: number;
	private isDisplay: DisplayStatus = DisplayStatus.DISPLAY;

	constructor(engine: Engine, index: number = 0) {

		this._engine = engine;
		this._gIndex = index;
		
		engine.textureFactroy.embedFont("0123456789");
		engine.textureFactroy.updateToGL();

	}
	
	public create(config: ViewportRulerConfigInterface = null) {
		if(this.added) return;

		if(config) {
			Object.assign(this, config);
		}

		this._gs = [];
		this._tgs = [];
		this._texts = [];
		this._ticks = [];

		this.autoPosition();

		this.createTicks();
		this.checkTicks();
		this._engine.viewport.addEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
		this._engine.viewport.addEventListener(ViewportEvent.SIZE_CHANGE, this.autoPosition, this);
		this.added = true;
	}

	public destroy() {
		if(this.added) return;
		this._engine.viewport.removeEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
		this._engine.viewport.removeEventListener(ViewportEvent.SIZE_CHANGE, this.autoPosition, this);
		this._gs.forEach(g => g.destroy());
		this._tgs.forEach(g => g.destroy());
		this._ticks = null;
		this._texts = null;
		this.added = false;
	}

	public set display(n: DisplayStatus) {
		this.isDisplay = n;
		if(n == DisplayStatus.NONE) {
			this._gs.map(g => g.display = n);
			this._tgs.map(g => g.display = n);
		} else {
			this._gs[this.active].display = n;
			this._tgs[this.active].display = n;
		}
	}

	public get display(): DisplayStatus {
		return this.isDisplay;
	}

	public set opacity(n: number) {
		this._gs.map(g => g.opacity = n);
		this._tgs.map(g => g.opacity = n);
	}

	public get opacity(): number {
		return this._gs[0].opacity;
	}

	private autoPosition() {
		this.displayPosition = this.getAutoPosition();
		if(this.added) {
			this._ticks.forEach(t => this.setTickPosition(t, this.displayPosition));
			this._texts.forEach(t => this.setTickPosition(t, this.displayPosition));
		}
	}

	private createTicks() {
		this.scales = [];
		const steps = this.createSteps();
		steps.forEach((v, k) => {
			let geners = this.createGenerator(v.unitPerTick);
			this._gs.push(geners.tick);
			this._tgs.push(geners.text);
			this.scales.push(v.scale);
			if(v.scale == 1) {
				this.active = k;
				this._gs[k].display = DisplayStatus.DISPLAY;
				this._tgs[k].display = DisplayStatus.DISPLAY;
			}
		});
	}

	private checkTicks() {

		if(this.isDisplay == DisplayStatus.NONE) return;

		const vpScale = this._engine.viewport.scale;
		const scales = this.scales;
		const scaleLen = scales.length;
		const gs = this._gs;
		const tgs = this._tgs;
		const scaleNow = scales[this.active];
		
		let i = this.active;
		let a = this.active;
		if(vpScale > scaleNow) {
			while(i < scaleLen) {
				i ++;
				if(vpScale >= scales[i]) {
					a = i;
					break;
				}
			}
		} else if(vpScale < scaleNow) {
			while(i > 0) {
				i --;
				if(vpScale <= scales[i]) {
					a = i;
					break;
				}
			}
		}

		if(a != this.active) {
			gs[this.active].display = DisplayStatus.NONE;
			tgs[this.active].display = DisplayStatus.NONE;
			gs[a].display = DisplayStatus.DISPLAY;
			tgs[a].display = DisplayStatus.DISPLAY;
			this.active = a;
		}
	}

	private createSteps(): { scale: number, unitPerTick: number }[] {
		const scaleRange = this._engine.viewport.scaleRange;
		const min = numberClamp(0, 1, scaleRange[0]);
		const max = Math.max(1, scaleRange[1]);
		const steps = [];
		const k = 2;
		let n = 1;
		let u = 1;

		while(n >= min) {
			steps.unshift({
				scale: n,
				unitPerTick: u,
			});
			n /= k;
			u *= k;
		}

		n = 1;
		u = 1;

		while(n <= max) {
			(n != 1) && steps.push({
				scale: n,
				unitPerTick: u,
			});
			n *= k;
			u /= k;
		}

		return steps;
	}

	private createGenerator(unitPerTick: number): { tick: Generator, text: TextFieldGenerator } {

		const min = this.unitMin;
		const max = this.unitMax;
		const pu = this.pixelPerUnit;
		const ts = this.largeTickStep;
		const pos = this.displayPosition;
		const mins = this.tickSizeMin;
		const maxs = this.tickSizeMax;
		const mids = (mins + maxs) * 0.4;

		let g: Generator;
		if(this.axis == ViewportRulerAxis.X) {
			g = new Generator(this._engine, new RectMesh(0, 0.5), this._gIndex, this._gIndex, this.unitMax);
		} else {
			g = new Generator(this._engine, new RectMesh(0.5, 0), this._gIndex, this._gIndex, this.unitMax);
		}

		let tg: TextFieldGenerator = new TextFieldGenerator(this._engine, max.toString().length, -4, TextFieldVerticalAlign.BOTTOM, this._gIndex, this.unitMax / this.largeTickStep + 2);

		g.display = DisplayStatus.NONE;
		tg.display = DisplayStatus.NONE;

		for(let i = min; i <= max; i ++) {
			if(i % unitPerTick == 0) {
				let obj = this.createTick(g);
				this.setTickTranslation(obj, i * pu, pos);
				const d = Math.abs(i/unitPerTick%ts);
				if(d == 5) {
					this.setTickSize(obj, mids);
				} else if(d != 0) {
					this.setTickSize(obj, mins);
				} else {
					this.setTickSize(obj, maxs);
					let txt = this.createText(tg);
					txt.text = i.toString();
					this.setTickTranslation(txt, i * pu, pos);
				}
			}
		}

		return {
			tick: g,
			text: tg,
		};
	}
	
	private createTick(g: Generator): RenderObject {
		const obj = g.instance().show();
		this.setTickOutViewportStatus(obj);
		this.setTickSize(obj, this.tickSizeMin);
		obj.backgroundColor = this.tickColor;
		obj.attachViewportScale = false;
		this._ticks.push(obj);
		return obj;
	}

	private createText(g: TextFieldGenerator): TextField {
		const t = g.instance().show();
		t.fontSize = this.fontSize;
		t.borderColor = this.fontBorderColor;
		t.borderWidth = this.fontBorderWidth;
		t.color = this.fontColor;
		t.attachViewportScale = false;
		this.setTickOutViewportStatus(t);
		this._texts.push(t);
		return t;
	}

	private setTickSize(tick: RenderObject, size: number) {
		const axis = this.axis;
		if(axis == ViewportRulerAxis.X) {
			tick.size = [this.tickWidth, size];
		} else {
			tick.size = [size, this.tickWidth];
		}
	}

	private setTickTranslation(tick: RenderObject | TextField, x: number, y: number) {
		const axis = this.axis;
		if(tick instanceof TextField) {
			if(axis == ViewportRulerAxis.X) {
				const fd = y - this.tickSizeMin - this.fontSize - 2;
				x += 3;
				y = fd;
			} else {
				x = x;
				y -= this.tickSizeMax;
			}
		}
		if(axis == ViewportRulerAxis.X) {
			tick.translation = [x, y];
		} else {
			tick.translation = [y, x];
		}
	}

	private setTickPosition(tick: RenderObject | TextField, pos: number) {
		const axis = this.axis;
		const offset = tick.translation;

		if(axis == ViewportRulerAxis.X) {
			if(tick instanceof TextField) {
				pos = pos - this.tickSizeMin - this.fontSize - 2;
			}
			tick.translation = [offset[0], pos];
		} else {
			if(tick instanceof TextField) {
				pos -= this.tickSizeMax;
			}
			tick.translation = [pos, offset[1]];
		}
	}

	private setTickOutViewportStatus(tick: RenderObject | TextField) {
		const axis = this.axis;
		if(axis == ViewportRulerAxis.X) {
			tick.outViewportStatus = OutViewportStatus.Y;
		} else {
			tick.outViewportStatus = OutViewportStatus.X;
		}
	}

	private getAutoPosition(): number {
		const axis = this.axis;
		const vp = this._engine.viewport;
		const vpsize = vp.getViewportSize();
		if(axis == ViewportRulerAxis.X) {
			return this.tickSizeMax - vpsize[1]*0.5;
		} else {
			return this.tickSizeMax - vpsize[0]*0.5;
		}
	}
}