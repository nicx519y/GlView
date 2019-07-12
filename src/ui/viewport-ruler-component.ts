import { Generator } from "../generator";
import { Engine } from "../engine";
import { RectMesh } from "../mesh";
import { RenderObject, OutViewportStatus } from "../render-object";

export const enum ViewportRulerAxis {
	X = 1,
	Y = 2,
}

export class ViewportRulerComponent {
	private _g: Generator;
	private _tikes: RenderObject[] = [];		//刻度对象集合

	private _pixelPerUnit: number = 10;		//最小计量单位 等于多少像素
	private _displayPosition: number = 30;	//显示的位置
	private _unitPerTick: number;		//当前刻度 表示 计量单位的倍数
	private _unitPerTickStep: number;	//刻度表示的计量单位 每次递增步长
	private _displayMinStep: number;	//显示的最小刻度间隔 单位 像素

	private _tickSizeMin: number = 10;		//长刻度长度
	private _tickSizeMax: number;		//短刻度长度
	private _tickWidth: number = 1;							//刻度的宽度
	private _tickColor: number[] = [0,0,0,255];			//刻度的颜色

	private _minUnit: number = 0;
	private _maxUnit: number = 10000;

	constructor(engine: Engine) {
		this._g = new Generator(engine, new RectMesh(0, 0.5));
	}

	private createTick(): RenderObject {
		const obj = this._g.instance();
		obj.borderWidth = this._tickWidth * 0.5;
		obj.borderColor = this._tickColor;
		obj.size = [0.01, this._tickSizeMin];
		obj.outViewportStatus = OutViewportStatus.Y;
		return obj;
	}

	public create() {
		const ticks = this._tikes;
		const pu = this._pixelPerUnit;
		const dp = this._displayPosition;
		for(let i = this._minUnit; i <= this._maxUnit; i ++) {
			if(!ticks[i]) {
				ticks[i] = this.createTick().show();
			}
			ticks[i].translation = [pu * i, dp];
		}
	}

	
}