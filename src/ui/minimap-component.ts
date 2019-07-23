import { Screenshot } from "../screenshot";
import { RenderObject, OutViewportStatus } from "../render-object";
import { Engine } from "../engine";
import { Generator } from "../generator";
import { RectMesh } from "../mesh";
import { Viewport, ViewportEvent } from "../viewport";
import { Rectangle, DisplayStatus, rectangleIntersection } from "../utils";

export const enum MinimapAdsorbed {
	RB = 0,
	RT = 1,
	LB = 2,
	LT = 3,
}

export interface MinimapConfigInterface {
	width?: number;
	height?: number;
	borderWidth?: number;
	borderColor?: number[];
	focusBorderWidth?: number;
	focusBorderColor?: number[];
	focusBorderDashed?: number;
}

export class MinimapComponent {

	private engine: Engine;
	private vp: Viewport;
	private g: Generator;
	private screenshot: Screenshot;
	private baseBox: RenderObject;
	private focusBox: RenderObject;

	private adsorbed: MinimapAdsorbed = MinimapAdsorbed.RB;
	private position: number[] = [0, 0];
	private frameSize: number[] = [0, 0];

	private width: number = 0;
	private height: number = 0;
	private borderWidth: number = 1;
	private borderColor: number[] = [255,0,255,255];
	private focusBorderWidth: number = 1;
	private focusBorderColor: number[] = [255,0,0,255];
	private focusBorderDashed: number = 2;

	private _srcArea: Rectangle = new Rectangle();
	private _focusArea: Rectangle = new Rectangle();
	private _offset: number[] = [0,0];
	private _isAdded: boolean = false;

	constructor(engine: Engine, config: MinimapConfigInterface = null, index: number = 0) {
		config && Object.assign(this, config);
		this.engine = engine;
		this.vp = this.engine.viewport;
		this.g = new Generator(engine, new RectMesh(), index, index, 3);
		this.screenshot = new Screenshot(this.engine, this.width, this.height, true);
		this.setAdsorbedPosition();
	}

	public create() {
		if(this._isAdded) return;

		const base = this.g.instance().show();
		base.size = [this.width, this.height];
		base.backgroundColor = this.vp.getBackgroundColor();
		base.borderWidth = this.borderWidth;
		base.borderColor = this.borderColor;
		base.texture = this.screenshot.texture;
		base.outViewportStatus = OutViewportStatus.BOTH;
		base.translation = this._offset;

		const focus = this.g.instance().show();
		focus.borderColor = this.focusBorderColor;
		focus.borderDashed = this.focusBorderDashed;
		focus.borderWidth = this.focusBorderWidth;
		focus.outViewportStatus = OutViewportStatus.BOTH;
		focus.translation = this._offset;

		this.baseBox = base;
		this.focusBox = focus;
		this._isAdded = true;

		this.vp.addEventListener(ViewportEvent.SIZE_CHANGE, this.setAdsorbedPosition, this);
		this.vp.addEventListener(ViewportEvent.TRANSLATION_CHANGE, this.viewportToFocus, this);
		this.vp.addEventListener(ViewportEvent.SCALE_CHANGE, this.viewportToFocus, this);
		this.vp.addEventListener(ViewportEvent.SIZE_CHANGE, this.viewportToFocus, this);
	}

	public destroy() {
		if(!this._isAdded) return;
		this.vp.removeEventListener(ViewportEvent.SIZE_CHANGE, this.setAdsorbedPosition, this);
		this.vp.removeEventListener(ViewportEvent.TRANSLATION_CHANGE, this.viewportToFocus, this);
		this.vp.removeEventListener(ViewportEvent.SCALE_CHANGE, this.viewportToFocus, this);
		this.vp.removeEventListener(ViewportEvent.SIZE_CHANGE, this.viewportToFocus, this);
		this.g.clear();
		this.g.destroy();
		this.baseBox = null;
		this.focusBox = null;
		this._isAdded = false;
	}

	public setPosition(position: number[], adsorbed: MinimapAdsorbed = MinimapAdsorbed.RB) {
		this.position = position;
		this.adsorbed = adsorbed;
		if(this._isAdded) {
			this.setAdsorbedPosition();
		}
	}

	public set sourceArea(r: Rectangle) {
		this._srcArea.setAttrs(r.x, r.y, r.w, r.h);
		// 计算截图源尺寸
		const dw = this.width;
		const dh = this.height;
		const sw = r.w;
		const sh = r.h;
		const dk = dw/dh;
		const sk = sw/sh;
		
		let x, y, w, h;

		if(sk >= dk) {
			w = sw;
			h = sw / dk;
			x = r.x;
			y = r.y - (h - sh) / 2;
		} else {
			h = sh;
			w = sh * dk;
			y = r.y;
			x = r.x - (w - sw) / 2;
		}
		this.screenshot.setSourceArea(x, y, w, h);

		if(this._isAdded) {
			this.frameSize = this.getMapFrameSize();
			this.focusBox.translation = this.getFocusTranslation();
			this.viewportToFocus();
		}
	}

	public get sourceArea(): Rectangle {
		return this._srcArea;
	}

	public setFocusCenter(point: number[]) {
		const vpScale = this.vp.scale;
		const vpSize = this.vp.getViewportSize().map(v => v / vpScale);
		let x, y, w, h;
		x = point[0] - vpSize[0] / 2;
		y = point[1] - vpSize[1] / 2;
		this._focusArea.setAttrs(x, y, vpSize[0], vpSize[1]);
		this.focusArea = rectangleIntersection(this.focusArea, this.focusArea, this._srcArea);
	}

	public setFocusCenterUseScreenCoor(x: number, y: number) {
		const xy = this.getCoorByScreenPoint(x, y);
		this.setFocusCenter(xy);
	}

	public set opacity(n: number) {
		this.g.opacity = n;
	}

	public set display(n: DisplayStatus) {
		this.g.display = n;
	}

	public print(sourceIndexes: number[] = null) {
		this.screenshot.draw(sourceIndexes);
	}

	private setTranslation(trans: number[]) {
		this._offset = trans;
		if(this._isAdded) {
			this.baseBox.translation = trans;
			this.focusBox.translation = this.getFocusTranslation();
		}
	}

	private set focusArea(r: Rectangle) {
		this._focusArea.setAttrs(r.x, r.y, r.w, r.h);
		if(this._isAdded) {
			this.focusBox.size = this.getFocusSize();
			this.focusBox.translation = this.getFocusTranslation();
		}
	}

	private get focusArea(): Rectangle {
		return this._focusArea;
	}
	
	private getMapFrameSize(): number[] {
		const sw = this._srcArea.w;
		const sh = this._srcArea.h;

		if(sw == 0 || sh == 0) {
			return [0,0];
		}

		const k = this.width / this.height;
		const sk = sw / sh;
		let rw, rh;
		if(sk >= k) {
			rw = this.width - this.borderWidth * 2;
			rh = rw / sk;
		} else {
			rh = this.height - this.borderWidth * 2;
			rw = rh * sk;
		}

		return [rw, rh];
	}

	private getFocusSize(): number[] {
		const src = this._srcArea;
		const focus = this._focusArea;
		if(src.w == 0 || src.h == 0) {
			return [0, 0];
		}

		const k = this.frameSize[0] / src.w;
		const w = Math.min(focus.w, src.w);
		const h = Math.min(focus.h, src.h);
		return [w * k, h * k];
	}

	private getFocusTranslation(): number[] {
		const src = this._srcArea;
		const focus = this._focusArea;
		const fk = this.frameSize[0] / src.w;

		const rx = (focus.x + focus.w / 2 - (src.x + src.w / 2)) * fk + this._offset[0];
		const ry = (focus.y + focus.h / 2 - (src.y + src.h / 2)) * fk + this._offset[1];

		return [rx, ry];
	}

	private setAdsorbedPosition() {
		const vpSize = this.vp.getViewportSize();
		const dx = (vpSize[0] - this.width) / 2 - this.position[0];
		const dy = (vpSize[1] - this.height) / 2 - this.position[1];
		let pos: number[];
		switch(this.adsorbed) {
			case MinimapAdsorbed.RB:
				pos = [dx, -dy];
				break;
			case MinimapAdsorbed.RT:
				pos = [dx, dy];
				break;
			case MinimapAdsorbed.LB:
				pos = [-dx, -dy];
				break;
			case MinimapAdsorbed.LT:
				pos = [-dx, dy];
				break;
		}
		this.setTranslation(pos);
	}

	private viewportToFocus() {
		const vpScale = this.vp.scale;
		const vpSize = this.vp.getViewportSize().map(v => v / vpScale);
		const vpTranslation = this.vp.translation;

		this._focusArea.setAttrs(-vpTranslation[0], -vpTranslation[1], vpSize[0], vpSize[1]);
		this.focusArea = rectangleIntersection(this.focusArea, this.focusArea, this._srcArea);
	}

	/**
	 * 根据小地图相对坐标获取实际坐标
	 * @param x 
	 * @param y 
	 */
	private getCoorByScreenPoint(x: number, y: number): number[] {
		const w = this.width;
		const h = this.height;
		const src = this._srcArea;
		const k = w/h;
		const sk = src.w/src.h;
		let sx, sy, sw, sh, scale;

		if(sk >= k) {
			sw = w;
			sh = sw / sk;
			sx = 0;
			sy = (h - sh) / 2;
			scale = sw / src.w;
		} else {
			sh = h;
			sw = sh * sk;
			sx = (w - sw) / 2;
			sy = 0;
			scale = sw / src.w;
		}

		x = (x - sx) / scale + src.x;
		y = (y - sy) / scale + src.y;
		
		return [x, y];
	}

}