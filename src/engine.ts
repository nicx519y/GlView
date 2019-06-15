import { Mesh, PrimitiveMode, MeshConfig } from "./mesh";
// import { Searcher } from './searcher';

const MAX_INSTANCE = 100000;
const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const vec2 = glMatrix.vec2;
glMatrix.glMatrix.setMatrixArrayType(Float32Array);

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

var VertexAttributeStride: Map<VertexAttribute, number> = new Map();
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

var RenderAttributeStride: Map<RenderAttribute, number> = new Map();
RenderAttributeStride.set(RenderAttribute.VERTEX_OFFSET_VALUE, 1);
RenderAttributeStride.set(RenderAttribute.EDGE_OFFSET_VALUE, 1);
RenderAttributeStride.set(RenderAttribute.BACKGROUND_COLOR, 4);
RenderAttributeStride.set(RenderAttribute.UV_RECT, 4);
RenderAttributeStride.set(RenderAttribute.TRANSLATION, 2);
RenderAttributeStride.set(RenderAttribute.ROTATION, 1);
RenderAttributeStride.set(RenderAttribute.Z_ORDER, 1);

const RenderAttributeList = [
	// RenderAttribute.EDGE_OFFSET_VALUE,
	RenderAttribute.BACKGROUND_COLOR,
	RenderAttribute.UV_RECT,
	RenderAttribute.TRANSLATION,
	RenderAttribute.ROTATION,
	RenderAttribute.Z_ORDER,
	RenderAttribute.VERTEX_OFFSET_VALUE,
];

const vsSource = `#version 300 es
	in vec2 currVertex;				//顶点坐标
	in vec2 currOffsetRatio; 		//变型系数
	in vec2 textCoord;				//UV
	in vec4 UVRect;					//UVRect
	in vec4 backgroundColor;		//背景色
	in vec2 translation;			//偏移
	in float rotation;				//旋转
	in float zOrder;				//z
	in float vertexOffsetValue;		//变形值
	out vec2 vTexCoord;				//UV
	out vec4 vBgColor;
	uniform mat4 uViewportMatrix;	//视口矩阵
	uniform vec2 uConversionVec2;	//坐标转换矩阵
	
	mat4 getConversionMatrix() {
		return mat4(
			uConversionVec2.x, 0.0, 0.0, 0.0,
			0.0, uConversionVec2.y, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}

	mat4 getTranslationMatrix() {
		return mat4(
			1.0, 0.0, 0.0, 0.0,
			0.0, 1.0, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			translation.x, translation.y, 0.0, 1.0
		);
	}

	mat4 getRotationMatrix() {
		float cost = cos(rotation);
		float sint = sin(rotation);
		return mat4(
			cost, -sint, 0.0, 0.0,
			sint, cost, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}

	void main(void) {
		vec4 pos = vec4(currVertex + currOffsetRatio * vertexOffsetValue, 0, 1);
		pos = getConversionMatrix() * getTranslationMatrix() * getRotationMatrix() * pos;
		gl_Position = uViewportMatrix * pos + vec4(0,0,zOrder,0);

		vTexCoord = vec2(textCoord.x * UVRect.p + UVRect.s, textCoord.y * UVRect.q + UVRect.t);
		vBgColor = backgroundColor;
	}
`;

const fsSource = `#version 300 es
	precision mediump float;
	uniform sampler2D uSampler;
	in vec2 vTexCoord;
	in vec4 vBgColor;
	out vec4 fragColor;
	void main(void) {
		vec4 tColor = texture(uSampler, vTexCoord);
		float r1 = tColor.r;
		float g1 = tColor.g;
		float b1 = tColor.b;
		float a1 = tColor.a;
		
		float r2 = vBgColor.r/255.0;
		float g2 = vBgColor.g/255.0;
		float b2 = vBgColor.b/255.0;
		float a2 = vBgColor.a/255.0;
		
		float k = a1/a2;

		fragColor = vec4(mix(r2,r1,k), mix(g2,g1,k), mix(b2,b1,k), a1+a2);
	}
`;

export class Engine {
	private _gl;
	private _prg;
	private _searcher;
	private _vpmat4: Float32Array;
	private _vpmatIsModified: boolean = true;
	private _cvec2: Float32Array;
	private _conversionIsModified: boolean = true;
	private _bgColor: number[];
	private _unitList: RenderUnit[];
	constructor(canvas) {
		const width = canvas.width;
		const height = canvas.height;
		this._gl = canvas.getContext('webgl2');
		this._vpmat4 = mat4.create();
		this._cvec2 = glMatrix.vec2.fromValues(1/width*2, 1/height*2, 1);
		this._bgColor = [0,0,0,1];
		this._unitList = [];
		this._searcher = RTree(200);
		this.initPrg();
	}

	public get gl() {
		return this._gl;
	}
	public get prg() {
		return this._prg;
	}
	public get searcher() {
		return this._searcher;
	}

	// 视口矩阵
	public get vpMat4(): Float32Array {
		return this._vpmat4;
	}

	public get cvVec2(): Float32Array {
		return this._cvec2;
	}

	public set vpMatIsModified(is: boolean) {
		this._vpmatIsModified = is;
	}

	public set cvMatIsModified(is: boolean) {
		this._conversionIsModified = is;
	}

	public set bgColor(color: number[]) {
		this._bgColor = color;
	}

	// 渲染
	public draw() {
		const gl = this.gl;
		this.updateViewportMat();
		this.updateConversionVec();
		
		gl.clearColor.apply(gl, this._bgColor);
		gl.enable(gl.DEPTH_TEST);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this._unitList.forEach(unit => unit.draw());
	}

	public registVAO(mesh: Mesh): RenderUnit {
		let unit = new RenderUnit(this, mesh).regist();
		this._unitList.push(unit);
		return unit;
	}

	public render() {
		this.draw();
		window.requestAnimationFrame(() => this.render());
	}

	private initPrg() {
		let gl = this.gl;
		const vxShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
		const fgShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
		this._prg = gl.createProgram();
		gl.attachShader(this._prg, vxShader);
		gl.attachShader(this._prg, fgShader);
		gl.linkProgram(this._prg);

		if (!gl.getProgramParameter(this._prg, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}
		gl.useProgram(this._prg);
	}

	// 更新视口矩阵
	private updateViewportMat() {
		if(this._vpmatIsModified) {
			const gl = this.gl;
			const vpmLocal = gl.getUniformLocation(this.prg, 'uViewportMatrix');
			gl.uniformMatrix4fv(vpmLocal, false, this._vpmat4);
			this._vpmatIsModified = false;
		}
	}

	// 更新坐标变换矢量
	private updateConversionVec() {
		if(this._conversionIsModified) {
			const gl = this.gl;
			const cvLocal = gl.getUniformLocation(this.prg, 'uConversionVec2');
			gl.uniform2fv(cvLocal, this._cvec2);
			this._conversionIsModified = false;
		}
	}

	private loadShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}
}

export class RenderUnit {

	private _engine: Engine;
	private idlist: Map<string, number>;
	private _originConfig: MeshConfig;
	private _borderConfig: MeshConfig;
	private vao;
	private instanceCount: number = 0;
	private num: number = 0;

	private attribBuffers: Map<RenderAttribute, WebGLBuffer> = new Map();
	private attribBufferDatas: Map<RenderAttribute, Float32Array> = new Map();
	private attribIsModifieds: Map<RenderAttribute, boolean> = new Map();

	constructor(engine: Engine, mesh: Mesh) {
		this._engine = engine;
		this._originConfig = mesh.originMeshConfig;
		this._borderConfig = mesh.borderMeshConfig;

		const gl = engine.gl;

		// 初始化
		RenderAttributeList.forEach(attrib => {
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

		this.registAttribute(VertexAttribute.CURR_VERTEX, new Float32Array(this._originConfig.currVertexes));
		this.registAttribute(VertexAttribute.CURR_OFFSET_RATIO, new Float32Array(this._originConfig.currOffsetRatios));
		this.registAttribute(VertexAttribute.TEXTCOORD, new Float32Array(this._originConfig.uvs));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._originConfig.indeces), gl.STATIC_DRAW);

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
		let bufferData: Float32Array = this.attribBufferDatas.get(attrib);
		let stride: number = RenderAttributeStride.get(attrib);
		this.attribIsModifieds.set(attrib, true);
		bufferData.set(value.slice(0, stride), idx*stride);
	}

	public getAttribute(id: string, attrib: RenderAttribute): number[] {
		const idx = this.idlist.get(id);
		let bufferData: Float32Array = this.attribBufferDatas.get(attrib);
		let stride: number = RenderAttributeStride.get(attrib);
		return Array.from(bufferData.slice(idx*stride, (idx+1)*stride));
	}

	public add(): string {
		const id = this.createId();
		const idx = this.instanceCount;
		this.idlist.set(id, idx);

		//初始化属性
		this.setAttribute(id, RenderAttribute.TRANSLATION, [0,0]);
		this.setAttribute(id, RenderAttribute.BACKGROUND_COLOR, [0,0,0,1]);
		this.setAttribute(id, RenderAttribute.UV_RECT, [0,0,0,0]);
		this.setAttribute(id, RenderAttribute.VERTEX_OFFSET_VALUE, [1]);
		this.setAttribute(id, RenderAttribute.Z_ORDER, [0]);
		
		this.instanceCount ++;
		return id;
	}
	public remove(id: string) {
		const idx = this.idlist.get(id);
		const t = this.instanceCount;
		
		if(t < 1 || idx < 0 || idx >= t) {
			return;
		}
		RenderAttributeList.forEach((attrib: RenderAttribute) => this.removeAttributeBufferData(id, attrib));
		this.instanceCount --;
	}

	public draw() {
		const gl = this._engine.gl;
		const oc = this._originConfig;
		this.updateToGL();
		gl.bindVertexArray(this.vao);
		gl.drawElementsInstanced(oc.primitiveMode, oc.indeces.length, gl.UNSIGNED_INT, 0, this.instanceCount);
	}

	public get engine(): Engine {
		return this._engine;
	}

	private createId(): string {
		this.num ++;
		return this.num.toString();
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
}