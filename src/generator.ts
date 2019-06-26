import { Engine } from './engine';
import { Mesh, RectMesh, OneWayArrowMesh, TwoWayArrowMesh } from './mesh';
import { RenderUnit } from './render-unit';
import { RenderObject } from './render-object';
import { TextField } from './textfield';
import { FontTexture } from './texture';
import { Arrow } from './arrow';

export class Generator {
	private engine: Engine;
	private originUnit: RenderUnit;
	private borderUnit: RenderUnit;
	constructor(engine: Engine, mesh: Mesh) {
	this.engine = engine;
		this.originUnit = new RenderUnit(engine, mesh.originMeshConfig).regist();
		this.borderUnit = new RenderUnit(engine, mesh.borderMeshConfig).regist();
		this.engine.registVAO(this.originUnit);
		this.engine.registVAO(this.borderUnit, 1);
	}
	public instance(): RenderObject {
		return new RenderObject(this.originUnit, this.borderUnit);
	}
}

export class TextFieldGenerator {
	private engine: Engine;
	private texture: FontTexture;
	constructor(engine: Engine, texture: FontTexture) {
		this.engine = engine;
		this.texture = texture;
	}

	public instance(): TextField {
		return new TextField(new Generator(this.engine, new RectMesh(-0.5, -0.5)), this.texture);
	}
}

export class ArrowGenerator {
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

}