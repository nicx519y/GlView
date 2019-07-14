import { Engine } from "./engine";
import { EventDispatcher } from './events';
import * as glMatrix from "../lib/gl-matrix.js"
import { numberClamp } from "./utils";

const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;
const quat2 = glMatrix.quat2;
const RATIO = window.devicePixelRatio;
const MAX_SCALE = 2;
const MIN_SCALE = 0.05;

export enum ViewportEvent {
	TRANSLATION_CHANGE = 'translationChange',
	SCALE_CHANGE = 'scaleChange',
};

export class Viewport extends EventDispatcher {
	private _gl;
	private _cvec2: Float32Array;
	private _vpScaleVec2: Float32Array;
	private _vpTranslationVec2: Float32Array;
	private _bgColor: number[];
	private _vpWidth: number;
	private _vpHeight: number;
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
		this._cvec2 = vec2.fromValues(1/width*2, 1/height*2, 1);
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

		let cvVec2 = this._cvec2;
		cvVec2.set([1/width*2, 1/height*2], 0);
		this.cvMatIsModified = true;

		if(setCanvas) {
			const canvas = gl.canvas;
			canvas.width = w;
			canvas.height = h;
			canvas.style.width = width + 'px';
			canvas.style.height = height + 'px';
		}
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
		scale = numberClamp(MIN_SCALE, MAX_SCALE, scale);
		const vpScale = this._vpScaleVec2;
		const s = this.scale - scale;
		vec2.scale(vpScale, vpScale, scale/this.scale);
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
		const vpTranslation = this._vpTranslationVec2;
		//Y 轴反转
		const p = vec3.fromValues(dx * RATIO / width * 2, dy * RATIO / height * 2, 0);
		// 转化为归一化坐标
		vec2.add(vpTranslation, vpTranslation, p);
		this.vpTranslationIsModified = true;
		dispatch && this.dispatchEvent(ViewportEvent.TRANSLATION_CHANGE);
	}

	resetTranslationAndScale(offsetX: number, offsetY: number, scale: number=1, originX: number=0, originY: number=0) {
		this._vpScaleVec2 = vec2.fromValues(1, 1);
		this._vpTranslationVec2 = vec2.fromValues(0, 0);
		this.scaleOrigin(scale, originX, originY);
		this.translate(offsetX, offsetY);
	}

	get translation(): Float32Array {
		return this._vpTranslationVec2;
	}

	/**
	 * 从屏幕坐标转换程世界坐标
	 * @param x 
	 * @param y 
	 * @param z 
	 */
	changeCoordinateFromScreen(x: number, y: number, z: number = 0) {
		const scaleVpMat = mat4.fromScaling(mat4.create(), vec3.fromValues(this._vpScaleVec2[0], this._vpScaleVec2[1], 1));
		const transVpMat = mat4.fromTranslation(mat4.create(), vec3.fromValues(this._vpTranslationVec2[0], this._vpTranslationVec2[1], 0));
		const vpmat = mat4.mul(mat4.create(), transVpMat, scaleVpMat);
		const canvas = this._gl.canvas;
		const w = canvas.width/RATIO/2;
		const h = canvas.height/RATIO/2;
		let invertMat = mat4.create();
		mat4.invert(invertMat, vpmat);
		let v:Float32Array = vec3.fromValues(x/w - 1, - y/h + 1, z);
		vec3.transformMat4(v, v, invertMat);
		vec3.mul(v, v, vec3.fromValues(w, h, 1));
		return v;
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