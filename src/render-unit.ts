
import { Mesh, MeshConfig } from './mesh';
import { Engine } from './engine';
import { PaintUnitInterface, IdCreator, getVertexPosition, getVertexAfterExpand } from './utils';
import * as glMatrix from "../lib/gl-matrix.js";

const MAX_INSTANCE = 100000;
const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;

// 模型属性
export const enum VertexAttribute {
	CURR_VERTEX_AND_RATIO = 'currVertexAndRatio',
	NEXT_VERTEX_AND_RATIO = 'nextVertexAndRatio',
	PREV_VERTEX_AND_RATIO = 'prevVertexAndRatio',
	UV_AND_EDGE_OFFSET_RATIO = 'uvAndEdgeOffsetRatio',
}

export var VertexAttributeStride: Map<VertexAttribute, number> = new Map();
VertexAttributeStride.set(VertexAttribute.CURR_VERTEX_AND_RATIO, 4);
VertexAttributeStride.set(VertexAttribute.NEXT_VERTEX_AND_RATIO, 4);
VertexAttributeStride.set(VertexAttribute.PREV_VERTEX_AND_RATIO, 4);
VertexAttributeStride.set(VertexAttribute.UV_AND_EDGE_OFFSET_RATIO, 4);

// 实例属性
export const enum RenderAttribute {
	VERTEX_AND_EDGE_OFFSET_VALUE = 'vertexAndEdgeOffsetValue',
	BACKGROUND_COLOR = 'backgroundColor',
	UV_RECT = 'UVRect',
	TRANSLATION_AND_ROTATION = 'translationAndRotation',
	IS_TEXT_AND_BORDER_WIDTH_AND_DASHED_AND_SCALE = 'isTextAndBorderWidthAndDashedAndScale',
	TEXT_BORDER_COLOR = 'textBorderColor',
	OPACITY = 'opacity',
}

export var RenderAttributeStride: Map<RenderAttribute, number> = new Map();
RenderAttributeStride.set(RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, 4);
RenderAttributeStride.set(RenderAttribute.BACKGROUND_COLOR, 4);
RenderAttributeStride.set(RenderAttribute.UV_RECT, 4);
RenderAttributeStride.set(RenderAttribute.TRANSLATION_AND_ROTATION, 4);
RenderAttributeStride.set(RenderAttribute.IS_TEXT_AND_BORDER_WIDTH_AND_DASHED_AND_SCALE, 4);
RenderAttributeStride.set(RenderAttribute.TEXT_BORDER_COLOR, 4);
RenderAttributeStride.set(RenderAttribute.OPACITY, 1);

export const RenderAttributeList = [
	RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE,
	RenderAttribute.BACKGROUND_COLOR,
	RenderAttribute.UV_RECT,
	RenderAttribute.TRANSLATION_AND_ROTATION,
	RenderAttribute.IS_TEXT_AND_BORDER_WIDTH_AND_DASHED_AND_SCALE,
	RenderAttribute.TEXT_BORDER_COLOR,
	RenderAttribute.OPACITY,
];


export class RenderUnit implements PaintUnitInterface {

	private _engine: Engine;
	private idmap: Map<string, number>;
	private idlist: string[];
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
			const data = new Float32Array(MAX_INSTANCE * RenderAttributeStride.get(attrib));
			data.fill(0.0);
			this.attribBuffers.set(attrib, gl.createBuffer());
			this.attribBufferDatas.set(attrib, data);
			this.attribIsModifieds.set(attrib, true);
		});

		this.idmap = new Map<string, number>();
		this.idlist = [];
	}

	public regist(): RenderUnit {
		const gl = this._engine.gl;
		const prg = this._engine.prg;
		const config = this._meshConfig;

		const currVs = config.currVertexes;
		const prevVs = config.prevVertexes;
		const nextVs = config.nextVertexes;
		const currRt = config.currOffsetRatios;
		const prevRt = config.prevOffsetRatios;
		const nextRt = config.nextOffsetRatios;
		const vlen = currVs.length / 2;

		const v1 = [];
		const v2 = [];
		const v3 = [];
		const v4 = [];

		const uvc = config.uvs;
		const eor = config.edgeOffsetRatios;

		for(let i = 0; i < vlen; i ++) {
			v1.push(currVs[i*2], currVs[i*2+1], currRt[i*2], currRt[i*2+1]);
			v2.push(prevVs[i*2], prevVs[i*2+1], prevRt[i*2], prevRt[i*2+1]);
			v3.push(nextVs[i*2], nextVs[i*2+1], nextRt[i*2], nextRt[i*2+1]);
			v4.push(uvc[i*2], uvc[i*2+1], eor[i], 0);
		}

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		this.registAttribute(VertexAttribute.CURR_VERTEX_AND_RATIO, new Float32Array(v1));
		this.registAttribute(VertexAttribute.PREV_VERTEX_AND_RATIO, new Float32Array(v2));
		this.registAttribute(VertexAttribute.NEXT_VERTEX_AND_RATIO, new Float32Array(v3));
		this.registAttribute(VertexAttribute.UV_AND_EDGE_OFFSET_RATIO, new Float32Array(v4));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._meshConfig.indeces), gl.STATIC_DRAW);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		return this;
	}
	public updateToGL(): boolean {

		const gl = this._engine.gl;
		let result = false;
		gl.bindVertexArray(this.vao);

		RenderAttributeList
			.forEach(attrib => {
				if(this.attribIsModifieds.get(attrib) === true) {
					this.updateBufferToGL(
						attrib, 
						this.attribBuffers.get(attrib), 
						this.attribBufferDatas.get(attrib), 
						RenderAttributeStride.get(attrib)
					);
					this.attribIsModifieds.set(attrib, false);
					result = true;
				}
			});
		return result;
	}

	public setAttribute(id: string, attrib: RenderAttribute, value: number[], offset: number = 0) {
		const idx = this.idmap.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;
		bufferData = this.attribBufferDatas.get(attrib);
		this.attribIsModifieds.set(attrib, true);
		bufferData.set(value.slice(0, stride - offset), idx*stride + offset);
	}

	public getAttribute(id: string, attrib: RenderAttribute, offset: number = 0, lenght: number = 0): number[] {
		const idx = this.idmap.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;

		bufferData = this.attribBufferDatas.get(attrib);
		this.attribIsModifieds.set(attrib, true);

		const start = idx*stride+offset;
		let end;
		if(lenght > 0) {
			end = Math.min(start + lenght, (idx+1)*stride);
		} else {
			end = (idx+1)*stride;
		}
		return Array.from(bufferData.subarray(start, end));
	}

	public add(): string {
		const id = this.createId();
		const idx = this.instanceCount;
		this.idmap.set(id, idx);
		this.idlist[idx] = id;
		this.instanceCount ++;

		RenderAttributeList.forEach(attrib => this.attribIsModifieds.set(attrib, true));

		return id;
	}
	public remove(id: string) {
		const idx = this.idmap.get(id);	
		const t = this.instanceCount;
		
		if(t < 1 || idx < 0 || idx >= t) {
			return;
		}
		RenderAttributeList.forEach((attrib: RenderAttribute) => {
			this.removeAttributeBufferData(id, attrib);
			this.attribIsModifieds.set(attrib, true);
		});

		const lastId = this.idlist[this.instanceCount - 1];
		this.idmap.set(lastId, idx);
		this.idlist[idx] = lastId;

		this.idmap.delete(id);
		this.idlist.pop();

		this.instanceCount --;

	}

	public clear() {
		this.attribBufferDatas.forEach(v => v.fill(0));
		this.attribIsModifieds.forEach((v, k) => this.attribIsModifieds.set(k, true));
		this.idmap.clear();
		this.idlist = [];
		this.instanceCount = 0;
	}

	public fill(attrib: RenderAttribute, value: number) {
		this.attribBufferDatas.get(attrib).fill(value);
		this.attribIsModifieds.set(attrib, true);
	}

	/**
	 * 批量set
	 * @param id 
	 * @param attrib 
	 * @param value 
	 * @param offset 
	 */
	public batchSet(attrib: RenderAttribute, value: Float32Array | Array<number>, offset: number = 0) {
		const stride = RenderAttributeStride.get(attrib);

		if(stride <= offset) {
			return;
		}

		const buffer = this.attribBufferDatas.get(attrib);
		const len = this.instanceCount;
		const v = value.slice(0, stride - offset);
		let o = offset;
		for(let i = 0; i < len; i ++) {
			buffer.set(v, o);
			o += stride;
		}

		this.attribIsModifieds.set(attrib, true);
	}

	/**
	 * 批量在原来的值上叠加
	 * @param attrib 
	 * @param value 
	 * @param offset 
	 */
	public batchAdd(attrib: RenderAttribute, value: Float32Array | Array<number>, offset: number = 0) {
		const stride = RenderAttributeStride.get(attrib);

		if(stride <= offset) {
			return;
		}

		const buffer = this.attribBufferDatas.get(attrib);
		const len = this.instanceCount;
		const v = value.slice(0, stride - offset);
		const vl = v.length;
		let o = offset;

		for(let i = 0; i < len; i ++) {
			for(let j = 0; j < vl; j ++) {
				buffer[o + j] += v[j];
			}
			o += stride;
		}

		this.attribIsModifieds.set(attrib, true);
	}

	public destroy() {
		this.attribBuffers.clear();
		this.attribBufferDatas.clear();
		this.attribIsModifieds.clear();
		this.idmap.clear();
		this.idlist = [];
		this.instanceCount = 0;
		this.vao = null;
		this.borderVao = null;
	}


	public draw() {
		const gl = this._engine.gl;
		const oc = this._meshConfig;
		gl.bindVertexArray(this.vao);
		gl.drawElementsInstanced(oc.primitiveMode, oc.indeces.length, gl.UNSIGNED_INT, 0, this.instanceCount);
	}

	public get engine(): Engine {
		return this._engine;
	}

	/**
	 * 按ID获取实例的膨胀后真实顶点位置
	 * @param id 实例id
	 * @param expand 膨胀
	 */
	public getVertexesPositionById(id: string, expand: number = 0): number[] {
		// 顶点
		let cv = this._meshConfig.currVertexes;
		// 形变系数
		const co = this._meshConfig.currOffsetRatios;
		// 形变值
		const cov = this.getAttribute(id, RenderAttribute.VERTEX_AND_EDGE_OFFSET_VALUE, 0, 2);
		// 偏移
		const trans = this.getAttribute(id, RenderAttribute.TRANSLATION_AND_ROTATION, 0, 2);
		// 旋转
		const rot = this.getAttribute(id, RenderAttribute.TRANSLATION_AND_ROTATION, 2, 1)[0];
		// 顶点数量
		const len = cv.length / 2;

		let mat = mat4.create();
		mat4.fromZRotation(mat, -rot);

		let vertexes = [];
		for(let i = 0; i < len; i ++) {
			const vs = vec3.fromValues(cv[i*2], cv[i*2+1], 0);
			const ratio = vec3.fromValues(co[i*2], co[i*2+1], 0);
			// 顶点形变后的坐标
			let vertex = getVertexPosition(vs, ratio, vec3.fromValues(cov[0], cov[1], 0));
			vertexes.push(vertex);
		}

		const result = [];

		for (let j = 0; j < len; j ++) {
			let pidx = j == 0 ? len - 1 : j - 1;
			let nidx = j == len - 1 ? 0 : j + 1;
			const pv = vertexes[pidx];
			const cv = vertexes[j];
			const nv = vertexes[nidx];
			// 前后边向量
			const pc = pv.map((v,k)=>v-cv[k]);
			const nc = nv.map((v,k)=>v-cv[k]);
			// 膨胀后的坐标
			let rv = getVertexAfterExpand(pc, nc, cv, expand);
			// 旋转
			vec3.transformMat4(rv, rv, mat);
			// 偏移
			vec3.add(rv, rv, vec3.fromValues(trans[0], trans[1], 0));
			result.push(rv[0], rv[1]);
		}

		return result;
	}

	private createId(): string {
		return IdCreator.createId();
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
		gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.DYNAMIC_DRAW, 0, t*size);
		
		gl.enableVertexAttribArray(local);
		gl.vertexAttribPointer(local, size, gl.FLOAT, false, size*FSIZE, offset*FSIZE);
		gl.vertexAttribDivisor(local, 1);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	
	private removeAttributeBufferData(id: string, attrib: RenderAttribute) {
		const idx = this.idmap.get(id);
		const bufferData: Float32Array = this.attribBufferDatas.get(attrib);
		const stride: number = RenderAttributeStride.get(attrib);
		const n: number = Math.max(1, this.instanceCount - 1);
		const arr = new Array<number>(stride);
		arr.fill(0);
		bufferData.set(bufferData.slice(n*stride, (n+1)*stride), idx*stride);
		bufferData.set(arr, n*stride);
	}

}
