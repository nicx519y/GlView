import { Engine } from './engine';
import { RenderAttribute, RenderUnit } from './render-unit';
import { ImageTexture } from './texture';
import { Searcher } from './searcher';
import { getBounds, IdCreator, arrayEqual } from './utils';
import { ComponentInterface } from './interfaces';
import { SearchableObject } from './searchable-object';

export class RenderObject extends SearchableObject implements ComponentInterface {
	private _id: string;
	private _originUnit: RenderUnit;
	private _borderUnit: RenderUnit;
	private _originId: string;
	private _borderId: string;
	private _isAdded: boolean;
	private _isBorderAdded: boolean;
	private _texture: ImageTexture;
	private _textureHandler: Function;
	private _needReset: boolean = false;

	private _attribs = {
		'translation': [0,0],
		'rotation': 0,
		'backgroundColor': [0,0,0,255],
		'uv': null,
		'vertexOffsetValue': [0,0],
		'isText': false,
		'textBorderWidth': 0,
		'textBorderColor': [0,0,0,0],
		'borderWidth': 0,
		'borderColor': [0,0,0,255],
	};

	constructor(originUnit: RenderUnit, borderUnit: RenderUnit) {
		super(originUnit.engine.searcher);
		this._originUnit = originUnit;
		this._borderUnit = borderUnit;
		this._id = IdCreator.createId();
		this._textureHandler = t => this.changeUV(t);
	}

	public get id(): string {
		return this._id;
	}

	public get engine(): Engine {
		return this._originUnit.engine;
	}

	public get isShown(): boolean {
		return this._isAdded;
	}

	public show() {
		if(!this._isAdded) {
			this._originId = this._originUnit.add();
			this._isAdded = true;
			this.updateStatus();
			this.searchable && this.registToSearcher();
		}
		return this;
	}

	public hide() {
		this._isAdded && this._originUnit.remove(this._originId);
		this._isBorderAdded && this._borderUnit.remove(this._borderId);
		this._isAdded = false;
		this._isBorderAdded = false;
		this.deregistToSearcher();
		return this;
	}

	public set translation(offset: number[]) {
		if(!this._needReset && arrayEqual(offset, this._attribs['translation'])) return;
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.TRANSLATION_AND_ROTATION, offset, 0);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION_AND_ROTATION, offset, 0);
		this._attribs['translation'] = offset;
		this.searchable && this.registToSearcher();
	}

	public get translation(): number[] {
		return this._attribs['translation'];
	}

	public set rotation(radian: number) {
		if(!this._needReset && this.rotation == radian) return;
		const data = [radian];
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.TRANSLATION_AND_ROTATION, data, 2);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION_AND_ROTATION, data, 2);
		this._attribs['rotation'] = radian;
		this.searchable && this.registToSearcher();
	}

	public get rotation(): number {
		return this._attribs['rotation'];
	}

	public set backgroundColor(color: number[]) {
		if(!this._needReset && arrayEqual(color, this._attribs['backgroundColor'])) return;
		const data = color.map(c => c/255);
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.BACKGROUND_COLOR, data);
		this._attribs['backgroundColor'] = color;
	}

	public get backgroundColor(): number[] {
		return this._attribs['backgroundColor'];
	}

	public set texture(texture: ImageTexture) {
		if(!texture || texture instanceof ImageTexture) return;
		const t = this._texture;
		const tt = texture as ImageTexture;
		if(!this._needReset && arrayEqual([t.u,t.v,t.width,t.height], [tt.u,tt.v,tt.width,tt.height])) return;
		this._texture.unbind(this._textureHandler);
		this._texture = texture;
		this.changeUV(this._texture);
		this._texture.bind(this._textureHandler);
	}

	public set borderWidth(width: number) {
		if(!this._needReset && width == this._attribs.borderWidth) return;
		
		const data = [width];
		if(width <= 0) {
			this.removeBorder();
			return;
		} else if(this.borderWidth <= 0) {
			this.addBorder();
		}

		if(this._isBorderAdded) {
			this._borderUnit.setAttribute(this._borderId, RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, data, 2);
			this.borderColor = this.borderColor;
		}

		this._attribs['borderWidth'] = width;
	}

	public get borderWidth(): number {
		return this._attribs['borderWidth'];
	}

	public set borderColor(color: number[]) {
		if(!this._needReset && arrayEqual(color, this._attribs['borderColor'])) return;
		const data = color.map(c => c/255);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.BACKGROUND_COLOR, data);
		this._attribs['borderColor'] = color;
	}

	public get borderColor(): number[] {
		return this._attribs['borderColor'];
	}

	public set vertexOffsetValue(value: number[]) {
		if(!this._needReset && arrayEqual(value, this._attribs['vertexOffsetValue'])) return;
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, value);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, value);
		this._attribs['vertexOffsetValue'] = value;
		this.searchable && this.registToSearcher();
	}

	public get vertexOffsetValue(): number[] {
		return this._attribs['vertexOffsetValue'];
	}

	public set size(value: number[]) {
		this.vertexOffsetValue = value;
	}

	public get size(): number[] {
		return this.vertexOffsetValue;
	}

	public set isText(ist: boolean) {
		if(!this._needReset && this._attribs['isText'] == ist) return;
		let r = ist? 1: 0;
		const data = [r];
		this._originUnit.setAttribute(this._originId, RenderAttribute.IS_TEXT_AND_BORDER_WIDTH, data, 0);
		this._attribs['isText'] = ist;
	}

	public get isText(): boolean {
		return this._attribs['isText'];
	}

	public set textBorderWidth(n: number) {
		if(!this._needReset && n == this._attribs['textBorderWidth']) return;
		const data = [n];
		this._originUnit.setAttribute(this._originId, RenderAttribute.IS_TEXT_AND_BORDER_WIDTH, data, 1);
		this._attribs['textBorderWidth'] = n;
	}

	public get textBorderWidth(): number {
		return this._attribs['textBorderWidth'];
	}

	public set textBorderColor(color: number[]) {
		if(!this._needReset && arrayEqual(color, this._attribs['textBorderColor'])) return;
		this._originUnit.setAttribute(this._originId, RenderAttribute.TEXT_BORDER_COLOR, color.map(c=>c/255));
		this._attribs['textBorderColor'] = color;
	}

	public get textBorderColor(): number[] {
		return this._attribs['textBorderColor'];
	}

	public getVertexPositions(expand: number = 0): number[] {
		return this._originUnit.getVertexesPositionById(this._originId, expand);
	}

	private changeUV(texture: ImageTexture) {
		const uv = [texture.u, texture.v, texture.width, texture.height];
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.UV_RECT, uv);
		this._attribs['uv'] = uv;
	}

	private updateStatus() {
		this._needReset = true;
		const s = this._attribs;
		for(let i in s) {
			this[i] = s[i];
		}
		this._needReset = false;
	}

	private addBorder() {
		if(!this._isBorderAdded) {
			this._borderId = this._borderUnit.add();
			this._isBorderAdded = true;

			this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION_AND_ROTATION, this.translation, 0);
			this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION_AND_ROTATION, [this.rotation], 2);
			this._borderUnit.setAttribute(this._borderId, RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, this.vertexOffsetValue, 0);
		}
	}

	private removeBorder() {
		if(this._isBorderAdded) {
			this._borderUnit.remove(this._borderId);
			this._isBorderAdded = false;
		}
	}
}