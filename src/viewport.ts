import { Engine } from "./engine";

export class Viewport {
	private _engine: Engine;
	private _scale: number = 1;
	private _scaleCenterX: number = 0;
	private _scaleCenterY: number = 0;
	private _offsetX: number = 0;
	private _offsetY: number = 0;
	constructor(engine: Engine) {
		this._engine = engine;
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
		let cvMat4 = this._engine.cvMat4;
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		glMatrix.mat4.fromScaling(cvMat4, glMatrix.vec3.fromValues(1/width*2,1/height*2,1));

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this._engine.cvMatIsModify = true;
	}
	/**
	 * 按照中心点缩放
	 * @param scale 缩放比例
	 * @param px 缩放中心x
	 * @param py 缩放中心y
	 */
	setScaleByPoint(scale: number, px: number, py: number) {
		const g = glMatrix;
		const canvas = this._engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		const vpmat = this._engine.vpMat4;
		const s1 = this._scale;
		const s2 = scale;
		const s = s2/s1;

		let p = g.vec3.fromValues(px, py, 0);
		let invertMat = g.mat4.create();
		g.mat4.invert(invertMat, vpmat);
		g.vec3.transformMat4(p, p, invertMat);
		g.vec3.mul(p, p, g.vec3.fromValues(1/width*2, 1/height*2,1));
		// g.vec3.transformMat4(p, p, invertMat);

		g.mat4.translate(vpmat, vpmat, g.vec3.fromValues(p[0]*(1-s), p[1]*(1-s), 0));
		g.mat4.scale(vpmat, vpmat, g.vec3.fromValues(s,s,1));
		// g.mat4.translate(vpmat, vpmat, g.vec3.fromValues(-p[0]*,-p[1],0));

		// console.log(vpmat);

		// g.mat4.translate(this._engine.vpMat4, this._engine.vpMat4, g.vec3.fromValues(-1,-1,0))
		// console.log(this._engine.vpMat4);
		// g.mat4.multiplyScalarAndAdd(this._engine.vpMat4, p[0]*(1-s), p[1]*(1-s), s);
		this._engine.vpMatIsModify = true;
		this._scale = scale;

		// px = (px - width/2) / width * 2;
		// py = - (py - height/2) / height * 2;

		// matrix.translate(px, py, 0);

		// matrix.scale(s, s, 1);
		// // matrix.translate(px*(1-s), py*(1-s), 0);
		// matrix.translate(-px, -py, 0);
		// this._engine.vpMatIsModify = true;
		// this._scale = scale;
	}
	/**
	 * 获取缩放比例
	 */
	get scale(): number {
		return this._scale;
	}

	setOffset(x: number, y: number) {
		const canvas = this._engine.gl.canvas;
		const width = canvas.width;
		const height = canvas.height;
		const matrix = this._engine.vpMat4;

		// matrix.translate();

		this._offsetX = x;
		this._offsetY = y;
		// this.updateViewportMatrix();
	}

	get offsetX(): number {
		return this._offsetX;
	}

	get offsetY(): number {
		return this._offsetY;
	}

}