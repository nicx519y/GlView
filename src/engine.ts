import { Mesh, PrimitiveMode, MeshConfig } from "./mesh";
import { Rectangle, getBounds } from "./utils";
import { Searcher } from "./searcher";
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
	RenderAttribute.EDGE_OFFSET_VALUE,
	RenderAttribute.BACKGROUND_COLOR,
	RenderAttribute.UV_RECT,
	RenderAttribute.TRANSLATION,
	RenderAttribute.ROTATION,
	RenderAttribute.Z_ORDER,
	RenderAttribute.VERTEX_OFFSET_VALUE,
];

const vsSource = `#version 300 es
	in vec2 currVertex;				//顶点坐标
	in vec2 prevVertex;
	in vec2 nextVertex;
	in vec2 currOffsetRatio; 		//变型系数
	in vec2 prevOffsetRatio;
	in vec2 nextOffsetRatio;
	in float edgeOffsetRatio;		//边偏移系数
	in float edgeOffsetValue;		//边偏移值
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

	vec2 getIntersectionVertex(
		in vec2 v1,
		in vec2 v2, 
		in float offset
	) {
		vec2 mid = normalize(normalize(v1) + normalize(v2));
		float theta = acos(dot(v1, v2) / (length(v1) * length(v2)));
		float l = offset / sin(theta * 0.5);
		return mid * l;
	}

	void main(void) {

		vec2 pv = prevVertex + prevOffsetRatio * vertexOffsetValue;
		vec2 cv = currVertex + currOffsetRatio * vertexOffsetValue;
		vec2 nv = nextVertex + nextOffsetRatio * vertexOffsetValue;
		vec2 pe = pv - cv;
		vec2 ne = nv - cv;
		mat4 transMat = getConversionMatrix() * getTranslationMatrix() * getRotationMatrix();
		// 求相邻两边交点向量
		vec2 intersection = getIntersectionVertex(pe, ne, edgeOffsetValue * edgeOffsetRatio);
		
		gl_Position = uViewportMatrix * transMat * vec4(cv, 0, 1) + transMat * vec4(intersection, zOrder, 0);

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
		this._searcher = new Searcher();
		this.initPrg();
	}

	public get gl() {
		return this._gl;
	}
	public get prg() {
		return this._prg;
	}
	public get searcher(): Searcher {
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
	private _searcher;
	private idlist: Map<string, number>;
	private _originConfig: MeshConfig;
	private _borderConfig: MeshConfig;
	private vao;
	private borderVao;
	private instanceCount: number = 0;
	private num: number = 0;

	private attribBuffers: Map<RenderAttribute, WebGLBuffer> = new Map();
	private attribBufferDatas: Map<RenderAttribute, Float32Array> = new Map();
	private attribIsModifieds: Map<RenderAttribute, boolean> = new Map();

	private bAttribBuffers: Map<RenderAttribute, WebGLBuffer> = new Map();
	private bAttribBufferDatas: Map<RenderAttribute, Float32Array> = new Map();
	private bAttribIsModifieds: Map<RenderAttribute, boolean> = new Map();

	constructor(engine: Engine, mesh: Mesh) {
		this._engine = engine;
		this._searcher = engine.searcher;
		this._originConfig = mesh.originMeshConfig;
		this._borderConfig = mesh.borderMeshConfig;

		const gl = engine.gl;

		// 初始化
		RenderAttributeList.forEach(attrib => {
			// 本体属性
			this.attribBuffers.set(attrib, gl.createBuffer());
			this.attribBufferDatas.set(attrib, new Float32Array(MAX_INSTANCE * RenderAttributeStride.get(attrib)));
			this.attribIsModifieds.set(attrib, true);
			// 边框属性
			this.bAttribBuffers.set(attrib, gl.createBuffer());
			this.bAttribBufferDatas.set(attrib, new Float32Array(MAX_INSTANCE * RenderAttributeStride.get(attrib)));
			this.bAttribIsModifieds.set(attrib, true);
		});

		this.idlist = new Map<string, number>();
	}

	public regist(): RenderUnit {
		const gl = this._engine.gl;
		const prg = this._engine.prg;

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		this.registAttribute(VertexAttribute.CURR_VERTEX, new Float32Array(this._originConfig.currVertexes));
		this.registAttribute(VertexAttribute.PREV_VERTEX, new Float32Array(this._originConfig.prevVertexes));
		this.registAttribute(VertexAttribute.NEXT_VERTEX, new Float32Array(this._originConfig.nextVertexes));
		this.registAttribute(VertexAttribute.CURR_OFFSET_RATIO, new Float32Array(this._originConfig.currOffsetRatios));
		this.registAttribute(VertexAttribute.PREV_OFFSET_RATIO, new Float32Array(this._originConfig.prevOffsetRatios));
		this.registAttribute(VertexAttribute.NEXT_OFFSET_RATIO, new Float32Array(this._originConfig.nextOffsetRatios));
		this.registAttribute(VertexAttribute.EDGE_OFFSET_RATIO, new Float32Array(this._originConfig.edgeOffsetRatios));
		this.registAttribute(VertexAttribute.TEXTCOORD, new Float32Array(this._originConfig.uvs));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._originConfig.indeces), gl.STATIC_DRAW);

		this.borderVao = gl.createVertexArray();
		gl.bindVertexArray(this.borderVao);

		this.registAttribute(VertexAttribute.CURR_VERTEX, new Float32Array(this._borderConfig.currVertexes));
		this.registAttribute(VertexAttribute.PREV_VERTEX, new Float32Array(this._borderConfig.prevVertexes));
		this.registAttribute(VertexAttribute.NEXT_VERTEX, new Float32Array(this._borderConfig.nextVertexes));
		this.registAttribute(VertexAttribute.CURR_OFFSET_RATIO, new Float32Array(this._borderConfig.currOffsetRatios));
		this.registAttribute(VertexAttribute.PREV_OFFSET_RATIO, new Float32Array(this._borderConfig.prevOffsetRatios));
		this.registAttribute(VertexAttribute.NEXT_OFFSET_RATIO, new Float32Array(this._borderConfig.nextOffsetRatios));
		this.registAttribute(VertexAttribute.EDGE_OFFSET_RATIO, new Float32Array(this._borderConfig.edgeOffsetRatios));
		this.registAttribute(VertexAttribute.TEXTCOORD, new Float32Array(this._borderConfig.uvs));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._borderConfig.indeces), gl.STATIC_DRAW);

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

		gl.bindVertexArray(this.borderVao);
		
		RenderAttributeList
			.filter(attrib => this.bAttribIsModifieds.get(attrib) === true)
			.forEach(attrib => {
				this.updateBufferToGL(
					attrib,
					this.bAttribBuffers.get(attrib),
					this.bAttribBufferDatas.get(attrib),
					RenderAttributeStride.get(attrib)
				);
				this.bAttribIsModifieds.set(attrib, false);
			});
	}

	public setAttribute(id: string, attrib: RenderAttribute, value: number[], isForBorder: boolean = false) {
		const idx = this.idlist.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;
		if(!isForBorder) {
			bufferData = this.attribBufferDatas.get(attrib);
			this.attribIsModifieds.set(attrib, true);
		} else {
			bufferData = this.bAttribBufferDatas.get(attrib);
			this.bAttribIsModifieds.set(attrib, true);
		}
		bufferData.set(value.slice(0, stride), idx*stride);

		if([RenderAttribute.ROTATION, RenderAttribute.TRANSLATION, RenderAttribute.VERTEX_OFFSET_VALUE].indexOf(attrib) >= 0) {
			const vs = this.getVertexesPositionById(id);
			// 改变这几个属性需要重新注册搜索器
			this.engine.searcher.insert({
				id: id,
				bounds: getBounds(vs),
				vertexes: vs,
			});
		}
	}

	public getAttribute(id: string, attrib: RenderAttribute, isForBorder: boolean = false): number[] {
		const idx = this.idlist.get(id);
		const stride: number = RenderAttributeStride.get(attrib);
		let bufferData: Float32Array;

		if(!isForBorder) {
			bufferData = this.attribBufferDatas.get(attrib);
			this.attribIsModifieds.set(attrib, true);
		} else {
			bufferData = this.bAttribBufferDatas.get(attrib);
			this.bAttribIsModifieds.set(attrib, true);
		}

		return Array.from(bufferData.slice(idx*stride, (idx+1)*stride));
	}

	public add(): string {
		const id = this.createId();
		const idx = this.instanceCount;
		this.idlist.set(id, idx);
		this.instanceCount ++;

		let vs = this.getVertexesPositionById(id);
		this.engine.searcher.insert({
			id: id,
			vertexes: vs,
			bounds: getBounds(vs),
		});

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

		this.engine.searcher.remove(id);
	}

	public draw() {
		const gl = this._engine.gl;
		const oc = this._originConfig;
		const bc = this._borderConfig;
		this.updateToGL();

		gl.bindVertexArray(this.borderVao);
		gl.drawElementsInstanced(bc.primitiveMode, bc.indeces.length, gl.UNSIGNED_INT, 0, this.instanceCount);

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

		bufferData = this.bAttribBufferDatas.get(attrib);
		bufferData.set(bufferData.slice((n-1)*stride, n*stride), idx*stride);
		bufferData.set(arr, (n-1)*stride);
	}

	/**
	 * 按ID获取实例的真实顶点位置
	 * @param id 实例id
	 */
	public getVertexesPositionById(id: string): number[] {
		// 顶点
		const cv = this._originConfig.currVertexes;
		// 形变系数
		const co = this._originConfig.currOffsetRatios;
		// 形变值
		const cov = this.getAttribute(id, RenderAttribute.VERTEX_OFFSET_VALUE)[0];
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
			let t = vec3.fromValues(co[i*2]*cov, co[i*2+1]*cov, 0);
			vec3.add(v, v, t);
			vec3.transformMat4(v, v, mat);
			vec3.add(v, v, vec3.fromValues(trans[0], trans[1], 0));
			result.push(v[0], v[1]);
		}

		return result;
	}
}