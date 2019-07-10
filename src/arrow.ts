import { RenderObject } from "./render-object";
import { IdCreator } from './utils';
import * as glMatrix from "../lib/gl-matrix.js";
import { ComponentInterface } from "./interfaces";
import { SearchableObject } from "./searchable-object";

const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;

export const enum ArrowType {
	ONE_WAY = 1,
	TWO_WAY = 2,
}

export class Arrow extends SearchableObject implements ComponentInterface {
	private _type: ArrowType = ArrowType.ONE_WAY;
	private _id: string;
	private _height: number;
	private _indent: number;
	private _borderWidth: number = 0;
	private _fromTo: number[] = [0,0,0,0];
	private _oneObj: RenderObject;
	private _twoObj: RenderObject;
	private _isShown: boolean = false;
	constructor(one: RenderObject, two: RenderObject, height: number, indent: number = 0) {
		super(one.engine.searcher);
		this._id = IdCreator.createId();
		this._oneObj = one;
		this._twoObj = two;
		this._height = height;
		this._indent = indent;
	}

	private get robj(): RenderObject {
		return this._type == ArrowType.ONE_WAY ? this._oneObj : this._twoObj;
	}

	private get nobj(): RenderObject {
		return this._type == ArrowType.TWO_WAY ? this._oneObj : this._twoObj;
	}

	public get id(): string {
		return this._id;
	}

	public get isShown(): boolean {
		return this._isShown;
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
		this.deregistToSearcher();
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

	set borderDashed(n: number) {
		this.robj.borderDashed = n;
		this.nobj.borderDashed = n;
	}

	get borderDashed(): number {
		return this.robj.borderDashed;
	}

	set opacity(n: number) {
		this.nobj.opacity = n;
	}

	get opacity(): number {
		return this.nobj.opacity;
	}

	private setFromToAndWidth() {
		const ft = this._fromTo;
		const indent = this._indent;
		const from = vec2.fromValues(ft[0], ft[1]);
		const to = vec2.fromValues(ft[2], ft[3]);
		const v = vec2.sub(vec2.create(), to, from);		//箭头向量
		const unitV = vec2.normalize(vec2.create(), v);		//单位向量

		const len = vec2.len(v) - 2 * indent;
		const offset = vec2.add(vec2.create(), unitV.map(p => p * indent), from);
		const rotation = Math.atan2(v[0], v[1]);

		let dist;
		if(this.type == ArrowType.ONE_WAY) {
			dist = Math.max(0, len - this._height);
		} else {
			dist = Math.max(0, len - 2 * this._height);
		}

		this.robj.translation = offset;
		this.robj.rotation = rotation;
		this.robj.vertexOffsetValue = [0, dist];

		this.searchable && this.registToSearcher();
	}

	public getVertexPositions(expand: number = 0): number[] {
		return this.robj.getVertexPositions(expand);
	}
}