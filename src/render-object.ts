import { Engine } from './engine';
import { Mesh, MeshConfig } from "./mesh";
import { VertexAttribute, VertexAttributeStride, RenderAttribute, RenderAttributeStride, RenderAttributeList, RenderUnit } from './render-unit';
import { ImageTexture } from './texture';
import { Searcher } from './searcher';
import { getBounds } from './utils';

export class RenderObject {
	private _id: string;
	private _originUnit: RenderUnit;
	private _borderUnit: RenderUnit;
	private _originId: string;
	private _borderId: string;
	private _isAdded: boolean;
	private _isBorderAdded: boolean;
	private _scr: Searcher;
	private _texture: ImageTexture;
	private _textureHandler: Function;

	private _attribs = {
		'translation': [0,0],
		'rotation': [0],
		'backgroundColor': [0,0,0,1],
		'uv': [0,0,0,0],
		'borderWidth': [0],
		'borderColor': [0,0,0,1],
		'vertexOffsetValue': [0,0],
	};

	constructor(originUnit: RenderUnit, borderUnit: RenderUnit) {
		this._originUnit = originUnit;
		this._borderUnit = borderUnit;
		this._scr = this._originUnit.engine.searcher;
		this._textureHandler = t => this.changeUV(t);
	}

	public show() {
		if(!this._isAdded) {
			this._originId = this._originUnit.add();
			this._id = this._originId;
			this._isAdded = true;

			const vs = this._originUnit.getVertexesPositionById(this._originId);
			const bounds = getBounds(vs);
			this._scr.insert({
				id: this._id,
				vertexes: vs,
				bounds: {
					minX: bounds.x,
					minY: bounds.y,
					maxX: bounds.x + bounds.w,
					maxY: bounds.y + bounds.h,
				},
			});
		}

		return this;
	}

	public hide() {
		this._isAdded && this._originUnit.remove(this._originId);
		this._isBorderAdded && this._borderUnit.remove(this._borderId);
		this._isAdded = false;
		this._isBorderAdded = false;

		const vs = this._originUnit.getVertexesPositionById(this._originId);
		const bounds = getBounds(vs);
		this._scr.remove(this._id);
		this._id = '';

		return this;
	}

	private addBorder() {
		if(!this._isBorderAdded) {
			this._borderId = this._borderUnit.add();
			this._isBorderAdded = true;

			this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION, this.translation);
			this._borderUnit.setAttribute(this._borderId, RenderAttribute.ROTATION, [this.rotation]);
			this._borderUnit.setAttribute(this._borderId, RenderAttribute.VERTEX_OFFSET_VALUE, this.vertexOffsetValue);
		}
	}

	private removeBorder() {
		if(this._isBorderAdded) {
			this._borderUnit.remove(this._borderId);
			this._isBorderAdded = false;
		}
	}

	public set translation(offset: number[]) {
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.TRANSLATION, offset);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.TRANSLATION, offset);
		this._attribs['translation'] = offset;

		if(this._isAdded) {
			const vs = this._originUnit.getVertexesPositionById(this._originId);
			const bounds = getBounds(vs);
			this._scr.insert({
				id: this._id,
				vertexes: vs,
				bounds: {
					minX: bounds.x,
					minY: bounds.y,
					maxX: bounds.x + bounds.w,
					maxY: bounds.y + bounds.h, 
				},
			});
		}
	}

	public get translation(): number[] {
		return this._attribs['translation'];
	}

	public set rotation(radian: number) {
		const data = [radian];
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.ROTATION, data);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.ROTATION, data);
		this._attribs['rotation'] = data;

		if(this._isAdded) {
			const vs = this._originUnit.getVertexesPositionById(this._originId);
			const bounds = getBounds(vs);
			this._scr.insert({
				id: this._id,
				vertexes: vs,
				bounds: {
					minX: bounds.x,
					minY: bounds.y,
					maxX: bounds.x + bounds.w,
					maxY: bounds.y + bounds.h, 
				},
			});
		}
	}

	public get rotation(): number {
		return this._attribs['rotation'][0];
	}

	public set backgroundColor(color: number[]) {
		const data = color.map(c => c/255);
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.BACKGROUND_COLOR, data);
		this._attribs['backgroundColor'] = data;
	}

	public get backgroundColor(): number[] {
		return this._attribs['backgroundColor'].map(c => c * 255);
	}

	public set texture(texture: ImageTexture) {
		if(this._texture && this._texture instanceof ImageTexture) {
			this._texture.unbind(this._textureHandler);
		}
		this._texture = texture;
		this.changeUV(this._texture);
		this._texture.bind(this._textureHandler);
	}

	public set borderWidth(width: number) {
		if(width <= 0) {
			this.removeBorder();
			return;
		} else {
			if(this.borderWidth <= 0) {
				this.addBorder();
			}
		}

		const data = [width];
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.EDGE_OFFSET_VALUE, data);
		this._attribs['borderWidth'] = data;
	}

	public get borderWidth(): number {
		return this._attribs['borderWidth'][0];
	}

	public set borderColor(color: number[]) {
		const data = color.map(c => c/255);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.BACKGROUND_COLOR, data);
		this._attribs['borderColor'] = data;
	}

	public get borderColor(): number[] {
		return this._attribs['borderColor'].map(c => c*255);
	}

	public set vertexOffsetValue(value: number[]) {
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.VERTEX_OFFSET_VALUE, value);
		this._isBorderAdded && this._borderUnit.setAttribute(this._borderId, RenderAttribute.VERTEX_OFFSET_VALUE, value);
		this._attribs['vertexOffsetValue'] = value;
	}

	public get vertexOffsetValue(): number[] {
		return this._attribs['vertexOffsetValue'];
	}

	private changeUV(texture: ImageTexture) {
		const uv = [texture.u, texture.v, texture.width, texture.height];
		this._isAdded && this._originUnit.setAttribute(this._originId, RenderAttribute.UV_RECT, uv);
		this._attribs['uv'] = uv;
	}

}