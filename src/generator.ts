import { Engine } from './engine';
import { Mesh, RectMesh, OneWayArrowMesh, TwoWayArrowMesh } from './mesh';
import { RenderUnit } from './render-unit';
import { RenderObject } from './render-object';
import { TextField } from './textfield';
import { Arrow } from './arrow';
import { ImageTexture } from './texture';
import { GeneratorInterface } from './interfaces';

export class Generator implements GeneratorInterface {
	private _engine: Engine;
	private originUnit: RenderUnit;
	private borderUnit: RenderUnit;
	constructor(engine: Engine, mesh: Mesh) {
		this._engine = engine;
		this.originUnit = new RenderUnit(engine, mesh.originMeshConfig).regist();
		this.borderUnit = new RenderUnit(engine, mesh.borderMeshConfig).regist();
		this.engine.registVAO(this.originUnit);
		this.engine.registVAO(this.borderUnit, 1);
	}
	public instance(): RenderObject {
		return new RenderObject(this.originUnit, this.borderUnit);
	}
	public destroy() {
		this.engine.unRegistVAO(this.originUnit);
		this.engine.unRegistVAO(this.borderUnit, 1);
		this.originUnit.destroy();
		this.borderUnit.destroy();
		this.originUnit = null;
		this.borderUnit = null;
	}
	public get engine(): Engine {
		return this._engine;
	}
}

export class TextFieldGenerator implements GeneratorInterface {
	private engine: Engine;
	private g: Generator;
	private txtMap: Map<string, ImageTexture>;
	constructor(engine: Engine, txtMap: Map<string, ImageTexture>) {
		this.engine = engine;
		this.txtMap = txtMap;
		this.g = new Generator(engine, new RectMesh());
	}

	public instance(): TextField {
		return new TextField(this.g, this.txtMap);
	}
	
	public destroy() {
		this.g.destroy();
		this.g = null;
	}
}

export class ArrowGenerator implements GeneratorInterface {
	private engine: Engine;
	private og: Generator;
	private tg: Generator;
	private _height: number;
	private _indent: number;
	constructor(engine: Engine, width: number, height: number, indent: number = 0) {
		this.engine = engine;
		this.og = new Generator(engine, new OneWayArrowMesh(width, height));
		this.tg = new Generator(engine, new TwoWayArrowMesh(width, height));
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

}