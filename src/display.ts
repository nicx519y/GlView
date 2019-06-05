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
	private searcher;
	private id: string;
	private offset: number[] = [0,0];
	private bgColor: number[] = [0,0,0,0];
	private uvRect: number[] = [0,0,0,0];
	private borderColor: number[] = [0,0,0,0];
	private borderWidth: number = 0;
	private transformValue: number = 1;
	private zOrder: number = 0;
	private _bounds: Rectangle = new Rectangle(0,0,0,0);
	private _isShown: boolean = false;
	constructor(uint: RenderUnit) {
		this.uint = uint;
		this.searcher = uint.engine.searcher;
		this.updateBounds();
	}
	public setOffset(x: number, y: number): Shape {
		this.offset = [x, y];
		if(this.id != undefined) {
			this.uint.setAttribute(
				this.id, RenderAttribute.OFFSET, 
				this.offset,
			);
		}
		this._isShown && this.clearSearchIndex();
		this.updateBounds();
		this._isShown && this.registSearchIndex();
		return this;
	}
	public getOffset(): number[] {
		return this.offset;
	}
	public setBgColor(color: number[]): Shape {
		this.bgColor = color;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.BACKGROUND_COLOR, this.bgColor);
		}
		return this;
	}
	public getBgColor(): number[] {
		return this.bgColor;
	}
	public setTexture(texture: ImageTexture): Shape {
		const x = texture.u;
		const y = texture.v;
		const w = texture.width;
		const h = texture.height;
		this.uvRect = [x, y, w, h];
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.UV_RECT, this.uvRect)
		}

		return this;
	}
	public setTransformValue(n: number): Shape {
		this.transformValue = n;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.TRANSFORM_VALUE, [n]);
		}
		this._isShown && this.clearSearchIndex();
		this.updateBounds();
		this._isShown && this.registSearchIndex();
		return this;
	}
	public getTransformValue(): number {
		return this.transformValue;
	}
	public setZOrder(n: number): Shape {
		this.zOrder = n;
		if(this.id != undefined) {
			this.uint.setAttribute(this.id, RenderAttribute.Z_ORDER, [this.zOrder]);
		}
		return this;
	}
	public getZOrder(): number {
		return this.zOrder;
	}

	public show(): Shape {
		if(this.id != undefined || this._isShown) {
			console.error('Shape is added. can not add again.');
			return;
		}
		this.id = this.uint.add();
		this.setOffset(this.offset[0], this.offset[1]);
		this.setBgColor(this.bgColor);
		this.uint.setAttribute(this.id, RenderAttribute.UV_RECT, this.uvRect);
		this._isShown = true;
		this.registSearchIndex();
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
		this.clearSearchIndex();
		return this;
	}

	public getBounds(): Rectangle {
		return this._bounds;	
	}

	/**
	 * 获取变形后各顶点绝对位置 
	 */
	public getVertexesAfterTransform(): number[] {
		const o = this.offset;
		return this.uint.mesh.getVertexesAfterTransform(this.transformValue)
			.map((v, k) => {
				if(k % 2 == 0) {
					return v + o[0];
				} else {
					return v + o[1];
				}
			});
	}

	private updateBounds() {
		const o = this.offset;
		const vs = this.uint.mesh.getVertexesAfterTransform(this.transformValue);
		const xs = vs.filter((v, k) => k % 2 != 0);
		const ys = vs.filter((v, k) => k % 2 == 0);
		let x1, y1, x2, y2;
		x1 = Math.min.apply(null, xs);
		y1 = Math.min.apply(null, ys);
		x2 = Math.max.apply(null, xs);
		y2 = Math.max.apply(null, ys);
		Object.assign(this._bounds, {
			x: x1 + o[0],
			y: y1 + o[1],
			w: x2 - x1,
			h: y2 - y1,
		});
	}

	private registSearchIndex() {
		this.searcher.insert(this.getBounds(), this);
	}

	private clearSearchIndex() {
		this.searcher.remove(this.getBounds(), this);
	}
}