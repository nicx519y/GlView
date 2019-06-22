import { Engine } from './engine';
import { Mesh } from './mesh';
import { RenderUnit } from './render-unit';
import { RenderObject } from './render-object';

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