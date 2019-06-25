import { Engine } from './engine';
import { Mesh, RectMesh } from './mesh';
import { RenderUnit } from './render-unit';
import { RenderObject } from './render-object';
import { TextField } from './textfield';
import { FontTexture } from './texture';

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