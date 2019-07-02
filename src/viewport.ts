import { Engine } from "./engine";
import * as glMatrix from "../lib/gl-matrix.js"

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

export class Viewport {
	private _engine: Engine;
	private _scale: number = 1;
	private _offsetX: number = 0;
	private _offsetY: number = 0;
	constructor(engine: Engine) {
		this._engine = engine;
		const canvas = engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		this.translate(-width/2, -height/2);
	}

	/**
	 * 设置背景色
	 * @param color 颜色
	 */
	setBackgroundColor(color: number[]) {
		color = color.map(val => val / 255);
		this._engine.bgColor = color;
	}
	/**
	 * 设置视口尺寸
	 * @param width 宽度
	 * @param height 高度
	 */
	setViewportSize(width: number, height: number) {
		const gl = this._engine.gl;
		const canvas = gl.canvas;
		let cvVec2 = this._engine.cvVec2;
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		cvVec2.set([1/width*2, 1/height*2], 0);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this._engine.cvMatIsModified = true;
	}
	/**
	 * 按照中心点缩放
	 * @param scale 缩放比例 （绝对值)
	 * @param px 缩放中心x (屏幕坐标)
	 * @param py 缩放中心y (屏幕坐标)
	 */
	setScaleOrigin(scale: number, px: number, py: number) {
		const vpmat = this._engine.vpMat4;
		const canvas = this._engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		scale = Math.max(Math.min(1, scale), 0.1);
		const s = scale/this._scale;

		//y轴反转
		let p = vec3.fromValues(px - width/2, height/2 - py, 0);
		//当前视口矩阵逆矩阵	
		let invertMat = mat4.create();
		mat4.invert(invertMat, vpmat);
		//归一化坐标系
		vec3.mul(p, p, vec3.fromValues(1/width*2, 1/height*2,1));
		//乘逆矩阵 求世界坐标
		vec3.transformMat4(p, p, invertMat);
		//偏移
		mat4.translate(vpmat, vpmat, vec3.fromValues(p[0]*(1-s), p[1]*(1-s), 0));
		//缩放
		mat4.scale(vpmat, vpmat, vec3.fromValues(s,s,1));
		this._engine.vpMatIsModified = true;
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
		const canvas = this._engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		const vpmat = this._engine.vpMat4;
		//Y 轴反转
		const p = vec3.fromValues(dx, dy, 0);
		// 转化为归一化坐标
		vec3.mul(p, p, vec3.fromValues(1/width*2, 1/height*2,1));
		// 按照坐标系比例缩放
		vec3.scale(p, p, 1/this._scale);
		mat4.translate(vpmat, vpmat, p);
		this._engine.vpMatIsModified = true;
		this._offsetX += dx;
		this._offsetY += dy;
	}

	resetTranslationAndRotation(scale: number=1, offsetX: number=0, offsetY: number=0) {
		const canvas = this._engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		const mat = this._engine.vpMat4;
		const p = vec3.fromValues((-width/2+offsetX)/width*2, (-height/2+offsetY)/height*2, 0);
		mat4.fromScaling(mat, vec3.fromValues(scale, scale, 1));
		mat4.translate(mat, mat, p);
		this._offsetX = offsetX;
		this._offsetY = offsetY;
		this._scale = scale;
		this._engine.vpMatIsModified = true;
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
		const vpmat = this._engine.vpMat4;
		const width = this._engine.gl.canvas.width;
		const height = this._engine.gl.canvas.height;
		let invertMat = mat4.create();
		mat4.invert(invertMat, vpmat);
		let v = vec3.fromValues(x - width/2, - y + height/2, z);
		vec3.mul(v, v, vec3.fromValues(1/width*2, 1/height*2,1));
		vec3.transformMat4(v, v, invertMat);
		vec3.mul(v, v, vec3.fromValues(width/2, height/2, 1));
		return v;
	}

}