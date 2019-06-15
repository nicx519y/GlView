import { Engine, RenderUnit, RenderAttribute } from './engine';
import { ImageTexture } from './texture';
import { Mesh } from './mesh';
import { Rectangle } from './utils';

export class Generator {
	private engine: Engine;
	private unit: RenderUnit;
	constructor(engine: Engine, mesh: Mesh) {
		this.engine = engine;
		this.unit = this.engine.registVAO(mesh);
	}
	public instance() {
		return new Shape(this.unit);
	}
}

export class Shape {
	private uint: RenderUnit;
	private id: string;
	private _translation: number[] = [0,0];
	private _rotation: number = 0;
	private _backgroundColor: number[] = [0,0,0,0];
	private _uvRect: number[] = [0,0,0,0];
	private _vertexOffsetValue: number = 1;
	private _borderColor: number[] = [0,0,0,0];
	private _borderWidth: number = 0;
	private _zOrder: number = 0;
	private _isShown: boolean = false;
	constructor(uint: RenderUnit) {
		this.uint = uint;
	}

	public set rotation(radian: number) {
		this._rotation = radian;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.ROTATION, [this._rotation]);
			this.uint.setAttribute(this.id, RenderAttribute.ROTATION, [this._rotation], true);
		}
	}

	public get rotation(): number {
		return this._rotation;
	}

	public set translation(trans: number[]) {
		this._translation = trans;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.TRANSLATION, this._translation);
			this.uint.setAttribute(this.id, RenderAttribute.TRANSLATION, this._translation, true);
		}
	}
	public get translation(): number[] {
		return this._translation;
	}
	public set backgroundColor(color: number[]) {
		this._backgroundColor = color;
		if(this.id != undefined) {
			this.uint.setAttribute(
				this.id, 
				RenderAttribute.BACKGROUND_COLOR, 
				this._backgroundColor
			);
		}
	}
	public get backgroundColor(): number[] {
		return this._backgroundColor;
	}
	public set texture(texture: ImageTexture) {
		const x = texture.u;
		const y = texture.v;
		const w = texture.width;
		const h = texture.height;
		this._uvRect = [x, y, w, h];
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.UV_RECT, this._uvRect)
		}
	}
	public set vertexOffsetValue(n: number) {
		this._vertexOffsetValue = n;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.VERTEX_OFFSET_VALUE, [n]);
			this.uint.setAttribute(this.id, RenderAttribute.VERTEX_OFFSET_VALUE, [n], true);
		}
	}
	public get vertexOffsetValue(): number {
		return this._vertexOffsetValue;
	}

	public set borderColor(color: number[]) {
		this._borderColor = color;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.BACKGROUND_COLOR, this._borderColor, true);
		}
	}

	public get borderColor(): number[] {
		return this._borderColor;
	}

	public set borderWidth(width: number) {
		this._borderWidth = width;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.EDGE_OFFSET_VALUE, [this._borderWidth], true);
		}
	}

	public get borderWidth(): number {
		return this._borderWidth;
	}

	public set zOrder(n: number) {
		this._zOrder = n;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.Z_ORDER, [this._zOrder]);
			this.uint.setAttribute(this.id, RenderAttribute.Z_ORDER, [this._zOrder-0.1], true);
		}
	}
	public get zOrder(): number {
		return this._zOrder;
	}

	public show(): Shape {
		if(this.id != undefined || this._isShown) {
			console.error('Shape is added. can not add again.');
			return;
		}
		this.id = this.uint.add();
		this.translation = this.translation;
		this.backgroundColor = this.backgroundColor;
		this.vertexOffsetValue = this.vertexOffsetValue;
		this.zOrder = this.zOrder;
		this.borderColor = this.borderColor;
		this.borderWidth = this.borderWidth;
		this.uint.setAttribute(this.id, RenderAttribute.UV_RECT, this._uvRect);
		this._isShown = true;
		return this;
	}
	public hide(): Shape {
		if(this.id == undefined || !this._isShown) {
			console.error('Shape wasn\'t added to Scene.');
			return;
		}
		this.uint.remove(this.id);
		this.id = undefined;
		this._isShown = false;
		return this;
	}
}