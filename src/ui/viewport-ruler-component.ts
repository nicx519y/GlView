import { Generator, TextFieldGenerator } from "../generator";
import { Engine } from "../engine";
import { RectMesh } from "../mesh";
import { RenderObject, OutViewportStatus, DisplayStatus } from "../render-object";
import { ViewportEvent } from "../viewport";
import { TextField } from "../textfield";
import { numberClamp } from "../utils";
import * as glMatrix from "../../lib/gl-matrix.js";

const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export const enum ViewportRulerAxis {
	X = 1,
	Y = 2,
}

const RATIO = window.devicePixelRatio;

export class ViewportRulerComponent {
	private _g: Generator;
	private _tg: TextFieldGenerator;
	private _ticks: RenderObject[] = [];		//刻度对象集合
	private _texts: TextField[] = [];

	private _pixelPerUnit: number = 10;			//最小计量单位 等于多少像素
	private _displayPosition: number = 30;		//显示的位置
	private _unitPerTick: number = 1;			//当前刻度 表示 计量单位的倍数
	private _unitPerTickStep: number = 2;		//刻度表示的计量单位 每次递增步长
	private _displayMinGap: number = 8;			//显示的最小刻度间隔 单位 像素
	private _displayMaxGap: number = 20;		//显示的最大刻度间隔 单位 像素
	private _largeTickStep: number = 10;		//多少刻度显示一个大刻度

	private _tickSizeMin: number = 3;			//长刻度长度
	private _tickSizeMax: number = 18;				//短刻度长度
	private _tickWidth: number = 1;				//刻度的宽度
	private _tickColor: number[] = [0,0,0,255];		//刻度的颜色

	private _fontSize: number = 14;
	private _fontColor: number[] = [0,0,0,255];
	private _fontBorderWidth: number = 0;
	private _fontBorderColor: number[] = [255,255,255,255];

	private _minUnit: number = 0;
	private _maxUnit: number = 3000;

	constructor(engine: Engine, index: number = 0) {
		this._g = new Generator(engine, new RectMesh(0, 0.5), index, index);
		this._tg = new TextFieldGenerator(engine, 4, -3, index);
		engine.textureFactroy.embedFont("0123456789");
		engine.textureFactroy.updateToGL();
	}
	
	public create() {
		this.createTicks();
		this.checkTicks(true);
		this._g.engine.viewport.addEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
	}

	public destroy() {
		this._g.engine.viewport.removeEventListener(ViewportEvent.SCALE_CHANGE, this.checkTicks, this);
		this._texts.forEach(v => v.hide());
		this._ticks.forEach(v => v.hide());
	}

	private createTick(): RenderObject {
		const obj = this._g.instance().show();
		obj.size = [this._tickWidth, this._tickSizeMin];
		obj.backgroundColor = this._tickColor;
		obj.outViewportStatus = OutViewportStatus.Y;
		obj.attachViewportScale = false;
		return obj;
	}

	private createText(): TextField {
		const t = this._tg.instance().show();
		t.fontSize = this._fontSize;
		t.borderColor = this._fontBorderColor;
		t.borderWidth = this._fontBorderWidth;
		t.color = this._fontColor;
		t.outViewportStatus = OutViewportStatus.Y;
		t.attachViewportScale = false;
		return t;
	}

	private createTicks() {
		const ticks = this._ticks;
		const texts = this._texts;
		const pu = this._pixelPerUnit;
		const dp = this._displayPosition;
		const fd = dp - this._tickSizeMin - this._fontSize * 0.5 - 2;
		for(let i = this._minUnit; i <= this._maxUnit; i ++) {
			if(!ticks[i]) {
				ticks[i] = this.createTick();
			}
			ticks[i].translation = [pu * i, dp];

			if(i % this._largeTickStep == 0) {
				if(!texts[i]) {
					texts[i] = this.createText();
				}
				texts[i].translation = [pu * i + 3, fd];
				texts[i].text = i.toString();
			}
		}
	}

	private checkTicks(checkDisplay: boolean = false) {
		const scale = this._g.engine.viewport.scale;
		const tickgap = this._pixelPerUnit * this._unitPerTick * scale;
		const ticks = this._ticks;
		const texts = this._texts;
		
		let isChange = checkDisplay;
		// 刻度间隔小于某值
		if(tickgap < this._displayMinGap) {
			this._unitPerTick *= this._unitPerTickStep;
			isChange = true;
		} else if(tickgap > this._displayMaxGap && this._unitPerTick > 1) {
			this._unitPerTick = Math.max(1, this._unitPerTick / this._unitPerTickStep);
			isChange = true;
		}
		
		if(isChange) {
			const pt = this._unitPerTick;
			const ts = this._largeTickStep;
			const mins = this._tickSizeMin;
			const maxs = this._tickSizeMax;
			const mids = (mins + maxs) * 0.4;
			for(let i = this._minUnit; i <= this._maxUnit; i ++) {
				if(i % pt == 0) {
					ticks[i].display = DisplayStatus.DISPLAY;
					const d = i/pt%ts;
					if(d != 0) {
						ticks[i].size = [this._tickWidth, mins];
						texts[i] && (texts[i].display = DisplayStatus.NONE);

						if(d == 5) {
							ticks[i].size = [this._tickWidth, mids];
						}

					} else {
						ticks[i].size = [this._tickWidth, maxs];
						texts[i] && (texts[i].display = DisplayStatus.DISPLAY);
					}
				} else {
					ticks[i].display = DisplayStatus.NONE;
					texts[i] && (texts[i].display = DisplayStatus.NONE);
				}
			}
		}
	}
	
}