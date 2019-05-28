import { Engine } from "./engine";

export class Viewport {
	private engine: Engine;
	private scaleX: number = 1;
	private scaleY: number = 1;
	private offsetX: number = 0;
	private offsetY: number = 0;
	constructor(engine: Engine) {
		this.engine = engine;
	}
	setBackgroundColor(color: number[]) {
		color = color.map(val => val / 255);
		this.engine.bgColor = color;
	}
	setViewportSize(width: number, height: number) {
		const gl = this.engine.gl;
		const canvas = gl.canvas;
		const cvMat4 = this.engine.cvMat4;
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		cvMat4.setScale(1/width*2, 1/height*2,1);
		this.engine.cvMatIsModify = true;
	}
	scale(x, y) {
		this.engine.vpMat4.scale(x, y);
		this.engine.vpMatIsModify = true;

		this.scaleX += x;
		this.scaleY += y;
	}
	setScale(x, y) {
		this.engine.vpMat4.setScale(x, y);
		this.engine.vpMatIsModify = true;

		this.scaleX = x;
		this.scaleY = y;
	}
	getScaleX() {
		return this.scaleX;
	}
	getScaleY() {
		return this.scaleY;
	}
	translate(x, y) {
		this.engine.vpMat4.translate(x, y);
		this.engine.vpMatIsModify = true;

		this.offsetX += x;
		this.offsetY += y;
	}
	setTranslate(x, y) {
		this.engine.vpMat4.setTranslate(x, y);
		this.engine.vpMatIsModify = true;

		this.offsetX = x;
		this.offsetY = y;
	}
	getTranslateX() {
		return this.offsetX;
	}
	getTranslateY() {
		return this.offsetY;
	}
}