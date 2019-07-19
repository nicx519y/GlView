import { Engine } from './engine';
import { Mesh, RectMesh, OneWayArrowMesh, TwoWayArrowMesh } from './mesh';
import { RenderUnit, RenderAttribute } from './render-unit';
import { RenderObject } from './render-object';
import { TextField } from './textfield';
import { Arrow } from './arrow';
import { DisplayStatus } from './utils';
import { GeneratorInterface } from './interfaces';

export class Generator implements GeneratorInterface {
	private _engine: Engine;
	private originUnit: RenderUnit;
	private borderUnit: RenderUnit;
	private originIdx: number;
	private borderIdx: number;
	constructor(engine: Engine, mesh: Mesh, originIndex: number = 0, borderIndex: number = 1, instanceCountMax: number = 0) {
		this._engine = engine;
		this.originIdx = Math.floor(originIndex);
		this.borderIdx = Math.floor(borderIndex);
		this.originUnit = new RenderUnit(engine, mesh.originMeshConfig, instanceCountMax).regist();
		this.borderUnit = new RenderUnit(engine, mesh.borderMeshConfig, instanceCountMax).regist();
		this.engine.registVAO(this.originUnit, this.originIdx);
		this.engine.registVAO(this.borderUnit, this.borderIdx);
	}
	public instance(): RenderObject {
		return new RenderObject(this.originUnit, this.borderUnit);
	}
	public destroy() {
		this.engine.unRegistVAO(this.originUnit, this.originIdx);
		this.engine.unRegistVAO(this.borderUnit, this.borderIdx);
		this.originUnit.destroy();
		this.borderUnit.destroy();
		this.originUnit = null;
		this.borderUnit = null;
	}
	public clear() {
		this.originUnit.clear();
		this.borderUnit.clear();
	}

	public set opacity(o: number) {
		// this.originUnit.batchAdd(RenderAttribute.OPACITY_AND_DISPLAY_AND_VPSCALE_AND_VPTRANS, [o], 0);
		// this.borderUnit.batchAdd(RenderAttribute.OPACITY_AND_DISPLAY_AND_VPSCALE_AND_VPTRANS, [o], 0);
		this.originUnit.opacity = o;
		this.borderUnit.opacity = o;
	}

	public set display(n: DisplayStatus) {
		this.originUnit.display = n;
		this.borderUnit.display = n;
	}

	public set translate(offset: number[]) {
		this.originUnit.batchAdd(RenderAttribute.TRANSLATION_AND_ROTATION, offset, 0);
		this.borderUnit.batchAdd(RenderAttribute.TRANSLATION_AND_ROTATION, offset, 0);
	}

	public get engine(): Engine {
		return this._engine;
	}
}

export const enum TextFieldVerticalAlign {
	TOP = 0,
	MIDDLE = 1,
	BOTTOM = 2,
}

export class TextFieldGenerator implements GeneratorInterface {
	private _engine: Engine;
	private gs: Generator[] = [];
	constructor(
		engine: Engine, 
		maxLen: number = 0, 
		wordSpace: number = 0, 
		verticalAlign: TextFieldVerticalAlign = TextFieldVerticalAlign.MIDDLE, 
		index: number = 0,
		instanceCountMax: number = 0,
		) {
		this._engine = engine;
		const align = - verticalAlign * 0.5 + 0.5;
		for(let i = 0; i < maxLen; i ++) {
			this.gs.push(new Generator(engine, new RectMesh(- (i + 1) * (wordSpace + 8) / 10, align), index, index, instanceCountMax));
		}
	}

	public instance(): TextField {
		return new TextField(this._engine, this.gs);
	}
	
	public destroy() {
		this.gs.forEach(g => g.destroy());
		this.gs = [];
	}

	public clear() {
		this.gs.forEach(g => g.clear());
	}

	public set display(n: DisplayStatus) {
		this.gs.forEach(g => g.display = n);
	}

	public set opacity(n: number) {
		this.gs.forEach(g => g.opacity = n);
	}

	public get engine(): Engine {
		return this._engine;
	}
}

export class ArrowGenerator implements GeneratorInterface {
	private _engine: Engine;
	private og: Generator;
	private tg: Generator;
	private _height: number;
	private _indent: number;
	constructor(
		engine: Engine, 
		width: number, 
		height: number, 
		indent: number = 0, 
		originIndex: number = 0, 
		borderIndex: number = 1,
		instanceCountMax: number = 0,
		) {
		this._engine = engine;
		this.og = new Generator(engine, new OneWayArrowMesh(width, height), originIndex, borderIndex, instanceCountMax);
		this.tg = new Generator(engine, new TwoWayArrowMesh(width, height), originIndex, borderIndex, instanceCountMax);
		this._height = height;
		this._indent = indent;
	}

	public instance(): Arrow {
		return new Arrow(this.og.instance(), this.tg.instance(), this._height, this._indent);
	}

	public destroy() {
		this.og.destroy();
		this.tg.destroy();
		this.og = null;
		this.tg = null;
	}

	public clear() {
		this.og.clear();
		this.tg.clear();
	}

	public set translate(offset: number[]) {
		this.og.translate = offset;
		this.tg.translate = offset;
	}

	public set display(n: DisplayStatus) {
		this.og.display = n;
		this.tg.display = n;
	}

	public set opacity(value: number) {
		this.og.opacity = value;
		this.tg.opacity = value;
	}

	public get engine(): Engine {
		return this._engine;
	}

}