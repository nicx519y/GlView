import { RenderObject } from "./render-object";
import * as glMatrix from "../lib/gl-matrix.js";

const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;

export const enum ArrowType {
	ONE_WAY = 1,
	TWO_WAY = 2,
}

export class Arrow {
	private _type: ArrowType = ArrowType.ONE_WAY;
	private _height: number;
	private _borderWidth: number = 0;
	private _fromTo: number[] = [0,0,0,0];
	private _oneObj: RenderObject;
	private _twoObj: RenderObject;
	private _isShown: boolean = false;
	constructor(one: RenderObject, two: RenderObject, height: number) {
		this._oneObj = one;
		this._twoObj = two;
		this._height = height;
	}

	private get robj(): RenderObject {
		return this._type == ArrowType.ONE_WAY ? this._oneObj : this._twoObj;
	}

	private get nobj(): RenderObject {
		return this._type == ArrowType.TWO_WAY ? this._oneObj : this._twoObj;
	}

	show(): Arrow {
		if(this._isShown) return this;
		this.robj.show();
		this.nobj.hide();
		this.setFromToAndWidth();
		this._isShown = true;
		return this;
	}

	hide(): Arrow {
		if(!this._isShown) return this;
		this.robj.hide();
		this._isShown = false;
		return this;
	}

	set fromTo(ft: number[]) {
		this._fromTo = ft;
		this.setFromToAndWidth();
	}

	get fromTo(): number[] {
		return this._fromTo;
	}

	set type(type: ArrowType) {
		if(type == this._type) return;
		this._type = type;
		this.nobj.hide();
		if(this._isShown) {
			this.robj.show();
			this.borderWidth = this.borderWidth;
			this.setFromToAndWidth();
		}
	}

	get type(): ArrowType {
		return this._type;
	}

	set backgroundColor(color: number[]) {
		this._oneObj.backgroundColor = color;
		this._twoObj.backgroundColor = color;
	}

	get backgroundColor(): number[] {
		return this.robj.backgroundColor;
	}

	set borderWidth(width: number) {
		this._borderWidth = width;
		this.robj.borderWidth = width;
		this.nobj.borderWidth = 0;
	}

	get borderWidth(): number {
		return this._borderWidth;
	}

	set borderColor(color: number[]) {
		this._oneObj.borderColor = color;
		this._twoObj.borderColor = color;
	}

	get borderColor(): number[] {
		return this.robj.borderColor;
	}

	private setFromToAndWidth() {
		const ft = this._fromTo;
		const from = vec2.fromValues(ft[0], ft[1]);
		const to = vec2.fromValues(ft[2], ft[3]);
		
		const v = vec2.sub(vec2.create(), to, from);
		const len = vec2.len(v);
		const rotation = Math.atan2(v[0], v[1]);
		let dist;
		if(this.type == ArrowType.ONE_WAY) {
			dist = Math.max(0, len - this._height);
		} else {
			dist = Math.max(0, len - 2 * this._height);
		}

		this.robj.translation = from;
		this.robj.rotation = rotation;
		this.robj.vertexOffsetValue = [0, dist];
	}
}