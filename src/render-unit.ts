
import { Mesh, MeshConfig } from './mesh';
import { Engine } from './engine';
import { getBounds, PaintUnitInterface } from './utils';
import * as glMatrix from "../lib/gl-matrix.js";

const MAX_INSTANCE = 100000;
const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;

// 模型属性
export const enum VertexAttribute {
	CURR_VERTEX = 'currVertex',
	NEXT_VERTEX = 'nextVertex',
	PREV_VERTEX = 'prevVertex',
	CURR_OFFSET_RATIO = 'currOffsetRatio',
	PREV_OFFSET_RATIO = 'prevOffsetRatio',
	NEXT_OFFSET_RATIO = 'nextOffsetRatio',
	EDGE_OFFSET_RATIO = 'edgeOffsetRatio',
	TEXTCOORD = 'textCoord',
}

export var VertexAttributeStride: Map<VertexAttribute, number> = new Map();
VertexAttributeStride.set(VertexAttribute.CURR_VERTEX, 2);
VertexAttributeStride.set(VertexAttribute.NEXT_VERTEX, 2);
VertexAttributeStride.set(VertexAttribute.PREV_VERTEX, 2);
VertexAttributeStride.set(VertexAttribute.CURR_OFFSET_RATIO, 2);
VertexAttributeStride.set(VertexAttribute.PREV_OFFSET_RATIO, 2);
VertexAttributeStride.set(VertexAttribute.NEXT_OFFSET_RATIO, 2);
VertexAttributeStride.set(VertexAttribute.EDGE_OFFSET_RATIO, 1);
VertexAttributeStride.set(VertexAttribute.TEXTCOORD, 2);

// 实例属性
export const enum RenderAttribute {
	VERTEX_OFFSET_VALUE = 'vertexOffsetValue',
	EDGE_OFFSET_VALUE = 'edgeOffsetValue',
	BACKGROUND_COLOR = 'backgroundColor',
	UV_RECT = 'UVRect',
	TRANSLATION = 'translation',
	ROTATION = 'rotation',
	Z_ORDER = 'zOrder',
}

export var RenderAttributeStride: Map<RenderAttribute, number> = new Map();
RenderAttributeStride.set(RenderAttribute.VERTEX_OFFSET_VALUE, 2);
RenderAttributeStride.set(RenderAttribute.EDGE_OFFSET_VALUE, 1);
RenderAttributeStride.set(RenderAttribute.BACKGROUND_COLOR, 4);
RenderAttributeStride.set(RenderAttribute.UV_RECT, 4);
RenderAttributeStride.set(RenderAttribute.TRANSLATION, 2);
RenderAttributeStride.set(RenderAttribute.ROTATION, 1);
RenderAttributeStride.set(RenderAttribute.Z_ORDER, 1);

export const RenderAttributeList = [
	RenderAttribute.EDGE_OFFSET_VALUE,
	RenderAttribute.BACKGROUND_COLOR,
	RenderAttribute.UV_RECT,
	RenderAttribute.TRANSLATION,
	RenderAttribute.ROTATION,
	RenderAttribute.Z_ORDER,
	RenderAttribute.VERTEX_OFFSET_VALUE,
];


export class RenderUnit implements PaintUnitInterface {

	private _engine: Engine;
	private idlist: Map<string, number>;
	private _meshConfig: MeshConfig;
	private vao;
	private borderVao;
	private instanceCount: number = 0;

	private attribBuffers: Map<RenderAttribute, WebGLBuffer> = new Map();
	private attribBufferDatas: Map<RenderAttribute, Float32Array> = new Map();
	private attribIsModifieds: Map<RenderAttribute, boolean> = new Map();

	constructor(engine: Engine, meshConfig: MeshConfig) {
		this._engine = engine;
		this._meshConfig = meshConfig;

		const gl = engine.gl;

		// 初始化
		RenderAttributeList.forEach(attrib => {
			// 本体属性
			this.attribBuffers.set(attrib, gl.createBuffer());
			this.attribBufferDatas.set(attrib, new Float32Array(MAX_INSTANCE * RenderAttributeStride.get(attrib)));
			this.attribIsModifieds.set(attrib, true);
		});

		this.idlist = new Map<string, number>();
	}

	public regist(): RenderUnit {
		const gl = this._engine.gl;
		const prg = this._engine.prg;

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		this.registAttribute(VertexAttribute.CURR_VERTEX, new Float32Array(this._meshConfig.currVertexes));
		this.registAttribute(VertexAttribute.PREV_VERTEX, new Float32Array(this._meshConfig.prevVertexes));
		this.registAttribute(VertexAttribute.NEXT_VERTEX, new Float32Array(this._meshConfig.nextVertexes));
		this.registAttribute(VertexAttribute.CURR_OFFSET_RATIO, new Float32Array(this._meshConfig.currOffsetRatios));
		this.registAttribute(VertexAttribute.PREV_OFFSET_RATIO, new Float32Array(this._meshConfig.prevOffsetRatios));
		this.registAttribute(VertexAttribute.NEXT_OFFSET_RATIO, new Float32Array(this._meshConfig.nextOffsetRatios));
		this.registAttribute(VertexAttribute.EDGE_OFFSET_RATIO, new Float32Array(this._meshConfig.edgeOffsetRatios));
		this.registAttribute(VertexAttribute.TEXTCOORD, new Float32Array(this._meshConfig.uvs));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._meshConfig.indeces), gl.STATIC_DRAW);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		return this;
	}
	public updateToGL() {
		const gl = this._engine.gl;
		gl.bindVertexArray(this.vao);

		RenderAttributeList
			.filter(attrib => this.attribIsModifieds.get(attrib) === true)
			.forEach(attrib => {
				this.updateBufferToGL(
					attrib, 
					this.attribBuffers.get(attrib), 
					this.attribBufferDatas.get(attrib), 
					RenderAttributeStride.get(attrib)
				);
				this.attribIsModifieds.set(attrib, false);
			});

	}

	public setAttribute(id: string, attrib: RenderAttribute, value: number[]) {
		const idx = this.idlist.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;
		bufferData = this.attribBufferDatas.get(attrib);
		this.attribIsModifieds.set(attrib, true);
		bufferData.set(value.slice(0, stride), idx*stride);

		// if([RenderAttribute.ROTATION, RenderAttribute.TRANSLATION, RenderAttribute.VERTEX_OFFSET_VALUE].indexOf(attrib) >= 0) {
		// 	const vs = this.getVertexesPositionById(id);
		// 	// 改变这几个属性需要重新注册搜索器
		// 	this.engine.searcher.insert({
		// 		id: id,
		// 		bounds: getBounds(vs),
		// 		vertexes: vs,
		// 	});
		// }
	}

	public getAttribute(id: string, attrib: RenderAttribute): number[] {
		const idx = this.idlist.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;

		bufferData = this.attribBufferDatas.get(attrib);
		this.attribIsModifieds.set(attrib, true);

		return Array.from(bufferData.slice(idx*stride, (idx+1)*stride));
	}

	public add(): string {
		const id = this.createId();
		const idx = this.instanceCount;
		this.idlist.set(id, idx);
		this.instanceCount ++;

		let vs = this.getVertexesPositionById(id);
		// this.engine.searcher.insert({
		// 	id: id,
		// 	vertexes: vs,
		// 	bounds: getBounds(vs),
		// });

		return id;
	}
	public remove(id: string) {
		const idx = this.idlist.get(id);
		const t = this.instanceCount;
		
		if(t < 1 || idx < 0 || idx >= t) {
			return;
		}
		RenderAttributeList.forEach((attrib: RenderAttribute) => this.removeAttributeBufferData(id, attrib));

		for(let i in this.idlist) {
			if(this.idlist.get(i) == this.instanceCount - 1) {
				this.idlist.set(i, idx);
				this.idlist.delete(id);
				break;
			}
		}
		this.instanceCount --;

		// this.engine.searcher.remove(id);
	}

	public draw() {
		const gl = this._engine.gl;
		const oc = this._meshConfig;
		this.updateToGL();
		
		gl.bindVertexArray(this.vao);
		gl.drawElementsInstanced(oc.primitiveMode, oc.indeces.length, gl.UNSIGNED_INT, 0, this.instanceCount);
	}

	public get engine(): Engine {
		return this._engine;
	}

	private createId(): string {
		return this.engine.createId();
	}

	private registAttribute(attrib: VertexAttribute, bufferData: Float32Array) {
		const gl = this.engine.gl;
		const prg = this.engine.prg;
		const buffer = gl.createBuffer();
		const stride = VertexAttributeStride.get(attrib);
		const local = gl.getAttribLocation(prg, attrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
		gl.vertexAttribPointer(local, stride, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(local);
	}

	private updateBufferToGL(attrib: string, buffer: WebGLBuffer, bufferData: Float32Array, size: number, offset: number = 0) {
		const gl = this._engine.gl;
		const prg = this._engine.prg;
		const FSIZE = bufferData.BYTES_PER_ELEMENT;
		const local = gl.getAttribLocation(prg, attrib);
		const t = this.instanceCount;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, bufferData.subarray(0, t*size), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(local);
		gl.vertexAttribPointer(local, size, gl.FLOAT, false, size*FSIZE, offset*FSIZE);
		gl.vertexAttribDivisor(local, 1);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	private removeAttributeBufferData(id: string, attrib: RenderAttribute) {
		const idx = this.idlist.get(id);
		let bufferData: Float32Array = this.attribBufferDatas.get(attrib);
		let stride: number = RenderAttributeStride.get(attrib);
		let n: number = Math.max(1, this.instanceCount - 1);
		let arr = new Array(stride);
		arr.fill(0);
		bufferData.set(bufferData.slice((n-1)*stride, n*stride), idx*stride);
		bufferData.set(arr, (n-1)*stride);
	}

	/**
	 * 按ID获取实例的真实顶点位置
	 * @param id 实例id
	 */
	public getVertexesPositionById(id: string): number[] {
		// 顶点
		const cv = this._meshConfig.currVertexes;
		// 形变系数
		const co = this._meshConfig.currOffsetRatios;
		// 形变值
		const cov = this.getAttribute(id, RenderAttribute.VERTEX_OFFSET_VALUE);
		// 偏移
		const trans = this.getAttribute(id, RenderAttribute.TRANSLATION);
		// 旋转
		const rot = this.getAttribute(id, RenderAttribute.ROTATION)[0];
		// 顶点数量
		const len = cv.length / 2;

		let mat = mat4.create();
		mat4.fromZRotation(mat, -rot);

		let result = [];
		for(let i = 0; i < len; i ++) {
			let v = vec3.fromValues(cv[i*2], cv[i*2+1], 0);
			let t = vec3.fromValues(co[i*2]*cov[0], co[i*2+1]*cov[1], 0);
			vec3.add(v, v, t);
			vec3.transformMat4(v, v, mat);
			vec3.add(v, v, vec3.fromValues(trans[0], trans[1], 0));
			result.push(v[0], v[1]);
		}

		return result;
	}
}
