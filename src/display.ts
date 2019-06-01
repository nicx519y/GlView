import { Engine, RenderUnit, RenderAttribute } from './engine';
import { ImageTexture } from './texture';
import { Mesh } from './mesh';

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
	private offset: number[] = [0,0];
	private bgColor: number[] = [0,0,0,0];
	private uvRect: number[] = [0,0,0,0];
	private borderColor: number[] = [0,0,0,0];
	private borderWidth: number = 0;
	private transformValue: number = 1;
	private zOrder: number = 0;
	constructor(uint: RenderUnit) {
		this.uint = uint;
	}
	public setOffset(x: number, y: number): Shape {
		this.offset = [x, y];
		if(this.id != undefined) {
			this.uint.setAttribute(
				this.id, RenderAttribute.OFFSET, 
				this.offset,
				);
		}
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
		return this;
	}
	// public setZOrder(n: number): Shape {
	// 	this.zOrder = n;
	// 	if(this.id != undefined) {
	// 		this.uint.setAttribute(this.id, RenderAttribute.Z_ORDER, [this.zOrder]);
	// 	}
	// 	return this;
	// }
	public getZOrder(): number {
		return this.zOrder;
	}
	public show(): Shape {
		if(this.id != undefined) {
			console.error('Shape is added. can not add again.');
			return;
		}
		this.id = this.uint.add();
		this.setOffset(this.offset[0], this.offset[1]);
		this.setBgColor(this.bgColor);
		this.uint.setAttribute(this.id, RenderAttribute.UV_RECT, this.uvRect);
		return this;
	}
	public hide(): Shape {
		if(this.id == undefined) {
			console.error('Shape wasn\'t added to Scene.');
			return;
		}
		this.uint.remove(this.id);
		this.id = undefined;
		return this;
	}
}

