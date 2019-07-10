import { Engine } from "./engine";
import * as glMatrix from "../lib/gl-matrix.js"
import { numberClamp } from "./utils";

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const RATIO = window.devicePixelRatio;
const MAX_SCALE = 2;
const MIN_SCALE = 0.1;


export class Viewport {
	private _gl;
	private _scale: number = 1;
	private _offsetX: number = 0;
	private _offsetY: number = 0;
	private _cvec2: Float32Array;
	private _vpmat4: Float32Array;
	private _bgColor: number[];
	public cvMatIsModified: boolean = true;
	public vpMatIsModified: boolean = true;
	constructor(gl) {
		this._gl = gl;
		const canvas = gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		this._bgColor = [0,0,0,1];
		this._vpmat4 = mat4.create();
		this._cvec2 = glMatrix.vec2.fromValues(1/width*2, 1/height*2, 1);
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
	setViewportSize(width: number, height: number) {
		const gl = this._gl;
		const canvas = gl.canvas;
		let cvVec2 = this._cvec2;
		canvas.width = width * RATIO;
		canvas.height = height * RATIO;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		cvVec2.set([1/width*2, 1/height*2], 0);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this.cvMatIsModified = true;
	}
	/**
	 * 按照中心点缩放
	 * @param scale 缩放比例 （绝对值)
	 * @param px 缩放中心x 
	 * @param py 缩放中心y 
	 */
	scaleOrigin(scale: number, px: number, py: number) {
		const vpmat = this._vpmat4;
		const canvas = this._gl.canvas;
		const width = canvas.width/RATIO/2;
		const height = canvas.height/RATIO/2;
		const s = numberClamp(MIN_SCALE, MAX_SCALE, scale) / this._scale;
		px /= width;
		py /= height;
		mat4.translate(vpmat, vpmat, vec3.fromValues(px*(1-s), py*(1-s), 0));
		//缩放
		mat4.scale(vpmat, vpmat, vec3.fromValues(s,s,1));
		this.vpMatIsModified = true;
		this._scale *= s;
	}
	/**
	 * 获取缩放比例
	 */
	get scale(): number {
		return this._scale;
	}

	/**
	 * 设置视口平移
	 * @param dx 增量
	 * @param dy 增量
	 */
	translate(dx: number, dy: number) {
		const canvas = this._gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		const vpmat = this._vpmat4;
		//Y 轴反转
		const p = vec3.fromValues(dx * RATIO, dy * RATIO, 0);
		// 转化为归一化坐标
		vec3.mul(p, p, vec3.fromValues(1/width*2, 1/height*2,1));
		// 按照坐标系比例缩放
		vec3.scale(p, p, 1/this._scale);
		mat4.translate(vpmat, vpmat, p);
		this.vpMatIsModified = true;
		this._offsetX += dx;
		this._offsetY += dy;
	}

	resetTranslationAndScale(offsetX: number, offsetY: number, scale: number=1, originX: number=0, originY: number=0) {
		const canvas = this._gl.canvas;
		const width = canvas.width/RATIO/2;
		const height = canvas.height/RATIO/2;
		const mat = this._vpmat4;
		const p: Float32Array = vec3.fromValues(-1, -1, 0);
		const dp: Float32Array = vec3.fromValues(offsetX/width, offsetY/height, 0);
		const op: Float32Array = vec3.fromValues(originX/width, originY/height, 0);
		mat4.fromTranslation(mat, p.map((v,k)=>v+dp[k]*scale+op[k]*(1-scale)));
		mat4.scale(mat, mat, vec3.fromValues(scale, scale, 1));

		this._offsetX = offsetX;
		this._offsetY = offsetY;
		this._scale = scale;
		this.vpMatIsModified = true;
	}

	get offsetX(): number {
		return this._offsetX;
	}

	get offsetY(): number {
		return this._offsetY;
	}

	/**
	 * 从屏幕坐标转换程世界坐标
	 * @param x 
	 * @param y 
	 * @param z 
	 */
	changeCoordinateFromScreen(x: number, y: number, z: number = 0) {
		const vpmat = this._vpmat4;
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

	get vpmat4(): Float32Array {
		return this._vpmat4;
	}

}