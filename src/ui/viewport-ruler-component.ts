import { Generator, TextFieldGenerator, TextFieldVerticalAlign } from "../generator";
import { Engine } from "../engine";
import { RectMesh } from "../mesh";
import { RenderObject, OutViewportStatus, DisplayStatus } from "../render-object";
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
	unitPerTick?: number;		//每刻度单位	
	displayGapMin?: number;		//刻度最小间隔	像素
	displayGapMax?: number;		//刻度最大间隔	像素
	largeTickStep?: number;		//大刻度递进倍数
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
	private _g: Generator;
	private _tg: TextFieldGenerator;
	private _ticks: RenderObject[] = [];		//刻度对象集合
	private _texts: TextField[] = [];

	private pixelPerUnit: number = 10;			//最小计量单位 等于多少像素
	private displayPosition: number = 30;		//显示的位置
	private unitPerTick: number = 1;			//当前刻度 表示 计量单位的倍数
	private unitPerTickStep: number = 2;		//刻度表示的计量单位 每次递增步长
	private displayGapMin: number = 8;			//显示的最小刻度间隔 单位 像素
	private displayGapMax: number = 20;		//显示的最大刻度间隔 单位 像素
	private largeTickStep: number = 10;		//多少刻度显示一个大刻度

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

	constructor(engine: Engine, config: ViewportRulerConfigInterface = null, index: number = 0) {

		if(config) {
			Object.assign(this, config);
		}

		if(this.axis == ViewportRulerAxis.X) {
			this._g = new Generator(engine, new RectMesh(0, 0.5), index, index);
		} else {
			this._g = new Generator(engine, new RectMesh(0.5, 0), index, index);
		}
		this._tg = new TextFieldGenerator(engine, this.unitMax.toString().length, -4, TextFieldVerticalAlign.BOTTOM, index);

		this.autoPosition();
		
		engine.textureFactroy.embedFont("0123456789");
		engine.textureFactroy.updateToGL();
	}
	
	public create() {
		if(this.added) return;
		this.createTicks();
		this.checkTicks(true);
		this._g.engine.viewport.addEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
		this.added = true;
	}

	public destroy() {
		if(this.added) return;
		this._g.engine.viewport.removeEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
		this._texts.forEach(v => v.hide());
		this._ticks.forEach(v => v.hide());
		this.added = false;
	}

	public autoPosition() {
		this.displayPosition = this.getAutoPosition();
		if(this.added) {
			this.createTicks();
			this.checkTicks(true);
		}
	}
	
	private createTick(): RenderObject {
		const obj = this._g.instance().show();
		this.setTickOutViewportStatus(obj);
		this.setTickSize(obj, this.tickSizeMin);
		obj.backgroundColor = this.tickColor;
		obj.attachViewportScale = false;
		return obj;
	}

	private createText(): TextField {
		const t = this._tg.instance().show();
		t.fontSize = this.fontSize;
		t.borderColor = this.fontBorderColor;
		t.borderWidth = this.fontBorderWidth;
		t.color = this.fontColor;
		t.attachViewportScale = false;
		this.setTickOutViewportStatus(t);
		return t;
	}

	private createTicks() {
		const ticks = this._ticks;
		const texts = this._texts;
		const pu = this.pixelPerUnit;
		const dp = this.displayPosition;
		
		const axis = this.axis;
		for(let i = this.unitMin; i <= this.unitMax; i ++) {
			const x = pu * i;
			if(!ticks[i]) {
				ticks[i] = this.createTick();
			}
			this.setTickTranslation(ticks[i], x, dp);
			if(i % this.largeTickStep == 0) {
				if(!texts[i]) {
					texts[i] = this.createText();
				}
				texts[i].text = i.toString();
				this.setTickTranslation(texts[i], x, dp);
			}
		}
	}

	private checkTicks(checkDisplay: boolean = false) {
		const scale = this._g.engine.viewport.scale;
		const tickgap = this.pixelPerUnit * this.unitPerTick * scale;
		let isChange = checkDisplay;
		// 刻度间隔小于某值
		if(tickgap < this.displayGapMin) {
			this.unitPerTick *= this.unitPerTickStep;
			isChange = true;
		} else if(tickgap > this.displayGapMax && this.unitPerTick > 1) {
			this.unitPerTick = Math.max(1, this.unitPerTick / this.unitPerTickStep);
			isChange = true;
		}
		
		if(isChange) {
			const ticks = this._ticks;
			const texts = this._texts;
			const pt = this.unitPerTick;
			const ts = this.largeTickStep;
			const mins = this.tickSizeMin;
			const maxs = this.tickSizeMax;
			const mids = (mins + maxs) * 0.4;
			const minu = this.unitMin;
			const maxu = this.unitMax;

			for(let i = minu; i <= maxu; i ++) {
				if(i % pt == 0) {
					ticks[i].display = DisplayStatus.DISPLAY;
					const d = i/pt%ts;

					if(d == 5) {
						this.setTickSize(ticks[i], mids);
						texts[i] && (texts[i].display = DisplayStatus.NONE);
					} else if(d != 0) {
						this.setTickSize(ticks[i], mins);
						texts[i] && (texts[i].display = DisplayStatus.NONE);
					} else {
						this.setTickSize(ticks[i], maxs);
						texts[i] && (texts[i].display = DisplayStatus.DISPLAY);
					}
				} else {
					ticks[i].display = DisplayStatus.NONE;
					texts[i] && (texts[i].display = DisplayStatus.NONE);
				}
			}
		}
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
		const vp = this._g.engine.viewport;
		const vpsize = vp.getViewportSize();
		if(axis == ViewportRulerAxis.X) {
			return this.tickSizeMax - vpsize[1]*0.5;
		} else {
			return this.tickSizeMax - vpsize[0]*0.5;
		}
	}
	
	/**
	 * 获取屏幕内的单位
	 */
	private getDisplayUnitsRange(): number[] {
		const vp = this._g.engine.viewport;
		const vpSize = vp.getViewportSize();
		const min = vp.changeCoordinateFromScreen(0, vpSize[1]).slice(0, 2);
		const max = vp.changeCoordinateFromScreen(vpSize[0], 0).slice(0, 2);
		let range = [];
		if(this.axis == ViewportRulerAxis.X) {
			range = [min[0], max[0]];
		} else {
			range = [min[1], max[1]];
		}
		return range.map(v => Math.floor(v / this.pixelPerUnit));
	}
	
}