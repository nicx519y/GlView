import { Engine } from "./engine";
import { EventDispatcher } from './events';
import * as glMatrix from "../lib/gl-matrix.js"
import { numberClamp } from "./utils";

const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;
const RATIO = window.devicePixelRatio;


export enum ViewportEvent {
	TRANSLATION_CHANGE = 'translationChange',
	SCALE_CHANGE = 'scaleChange',
	SIZE_CHANGE = 'sizeChange',
};

export class Viewport extends EventDispatcher {
	private _gl;
	private _cvec2: Float32Array;
	private _vpScaleVec2: Float32Array;
	private _vpTranslationVec2: Float32Array;
	private _bgColor: number[];
	private _vpWidth: number;
	private _vpHeight: number;
	private tempMat4: Float32Array = mat4.create();
	private tempVec3: Float32Array = vec3.create();
	private scaleMin: number = 0.05;
	private scaleMax: number = 2;
	public cvMatIsModified: boolean = true;
	public vpScaleIsModified: boolean = true;
	public vpTranslationIsModified: boolean = true;
	constructor(gl) {
		super();
		this._gl = gl;
		const canvas = gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		this._bgColor = [0,0,0,1];
		this._vpScaleVec2 = vec2.fromValues(1, 1);
		this._cvec2 = vec2.fromValues(1/width*2, 1/height*2);
		this.resetTranslation();
	}

	private resetTranslation() {
		const gl = this._gl;
		const canvas = gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		this._vpTranslationVec2 = vec2.fromValues(0, 0);
		this.translate(-width/2/RATIO, -height/2/RATIO);
	}

	/**
	 * 设置背景色
	 * @param color 颜色
	 */
	setBackgroundColor(color: number[]) {
		this._bgColor = color;
		this._gl.clearColor.apply(this._gl, color.map(c => c/255));
	}

	getBackgroundColor(): number[] {
		return this._bgColor;
	}

	/**
	 * 设置视口尺寸
	 * @param width 宽度
	 * @param height 高度
	 */
	setViewportSize(width: number, height: number, setCanvas: boolean = true) {
		this._vpWidth = width;
		this._vpHeight = height;

		const gl = this._gl;
		const w = width * RATIO;
		const h = height * RATIO;

		gl.viewport(0, 0, w, h);

		this._cvec2.set([1/width*2, 1/height*2]);

		this.cvMatIsModified = true;
		
		if(setCanvas) {
			const canvas = gl.canvas;
			canvas.width = w;
			canvas.height = h;
			canvas.style.width = width + 'px';
			canvas.style.height = height + 'px';
		}

		this.dispatchEvent(ViewportEvent.SIZE_CHANGE);
	}

	getViewportSize(): number[] {
		return [this._vpWidth, this._vpHeight];
	}

	/**
	 * 按照中心点缩放
	 * @param scale 缩放比例
	 * @param px 缩放中心x 
	 * @param py 缩放中心y 
	 */
	scaleOrigin(scale: number, px: number, py: number, dispatch: boolean = true) {
		scale = numberClamp(this.scaleMin, this.scaleMax, scale);
		const vpScale = this._vpScaleVec2;
		const s = this.scale - scale;
		const ms = scale/this.scale;
		vpScale[0] *= ms;
		vpScale[1] *= ms;
		this.translate(px*s, py*s);
		this.vpScaleIsModified = true;
		dispatch && this.dispatchEvent(ViewportEvent.SCALE_CHANGE);
	}
	/**
	 * 获取缩放比例
	 */
	get scale(): number {
		return this._vpScaleVec2[0];
	}

	/**
	 * 设置视口平移
	 * @param dx 增量
	 * @param dy 增量
	 */
	translate(dx: number, dy: number, dispatch: boolean = true) {
		const canvas = this._gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		this._vpTranslationVec2[0] += dx * RATIO / width * 2;
		this._vpTranslationVec2[1] += dy * RATIO / height * 2;
		this.vpTranslationIsModified = true;
		dispatch && this.dispatchEvent(ViewportEvent.TRANSLATION_CHANGE);
	}

	resetTranslationAndScale(offsetX: number, offsetY: number, scale: number=1, originX: number=0, originY: number=0) {
		this.resetTranslation();
		this._vpScaleVec2.set([1,1]);
		this.translate(offsetX, offsetY);
		this.scaleOrigin(scale, originX, originY);
	}

	get translation(): Float32Array {
		return this._vpTranslationVec2;
	}

	get scaleRange(): number[] {
		return [this.scaleMin, this.scaleMax];
	}

	/**
	 * 从屏幕坐标转换程世界坐标
	 * @param x 
	 * @param y 
	 * @param z 
	 */
	changeCoordinateFromScreen(x: number, y: number): Float32Array {
		const tvec = this.tempVec3;
		const tmat = this.tempMat4;

		mat4.identity(tmat);
		tvec.set([this._vpTranslationVec2[0], this._vpTranslationVec2[1], 0]);
		mat4.translate(tmat, tmat, tvec);
		tvec.set([this._vpScaleVec2[0], this._vpScaleVec2[1], 1]);
		mat4.scale(tmat, tmat, tvec);

		const canvas = this._gl.canvas;
		const w = canvas.width/RATIO/2;
		const h = canvas.height/RATIO/2;
		mat4.invert(tmat, tmat);

		tvec.set([x/w - 1, - y/h + 1, 0]);
		vec3.transformMat4(tvec, tvec, tmat);
		vec3.mul(tvec, tvec, vec3.fromValues(w, h, 1));
		return tvec.subarray(0, 2);
	}

	get cvec2(): Float32Array {
		return this._cvec2;
	}

	get vpScaleVec2(): Float32Array {
		return this._vpScaleVec2;
	}

	get vpTranslationVec2(): Float32Array {
		return this._vpTranslationVec2;
	}

	// get vpmat4(): Float32Array {
	// 	return this._vpmat4;
	// }

}