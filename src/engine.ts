import { Mesh, PrimitiveMode } from "./mesh";
import { Searcher } from './searcher';

const vsSource = `
	attribute vec2 aVertexPosition;		//顶点坐标
	attribute vec2 aTransformRatio; 	//变型系数
	attribute vec2 aTextCoord;			//UV
	attribute vec4 aUVRect;				//UVRect
	attribute vec4 aBgColor;			//背景色
	attribute vec2 aOffset;				//偏移
	attribute float aZOrder;			//z
	attribute float aTransformValue;	//变形值
	varying vec2 vTexCoord;				//UV
	varying vec4 vBgColor;
	uniform mat4 uViewportMatrix;		//视口矩阵
	uniform vec2 uConversionVec2;			//坐标转换矩阵
	
	void main(void) {
		vec2 pos = uConversionVec2 * vec2(aVertexPosition + aTransformRatio * aTransformValue + aOffset);
		gl_Position = uViewportMatrix * vec4(pos, 0, 1) + vec4(0,0,aZOrder,0);

		vTexCoord = vec2(aTextCoord.x * aUVRect.p + aUVRect.s, aTextCoord.y * aUVRect.q + aUVRect.t);
		vBgColor = aBgColor;
	}
`;

const fsSource = `
	precision mediump float;
	uniform sampler2D uSampler;
	varying vec2 vTexCoord;
	varying vec4 vBgColor;
	void main(void) {
		vec4 tColor = texture2D(uSampler, vTexCoord);
		float r1 = tColor.r;
		float g1 = tColor.g;
		float b1 = tColor.b;
		float a1 = tColor.a;
		
		float r2 = vBgColor.r/255.0;
		float g2 = vBgColor.g/255.0;
		float b2 = vBgColor.b/255.0;
		float a2 = vBgColor.a/255.0;
		
		float k = a1/a2;

		gl_FragColor = vec4(mix(r2,r1,k), mix(g2,g1,k), mix(b2,b1,k), a1+a2);
	}
`;

const MAX_INSTANCE = 100000;
var GL_PRIMITIVE_MODES: Map<PrimitiveMode, number> = new Map();
GL_PRIMITIVE_MODES.set(PrimitiveMode.TRIANGLE_STRIP, 5);
GL_PRIMITIVE_MODES.set(PrimitiveMode.TRIANGLE_FAN, 6);

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
glMatrix.glMatrix.setMatrixArrayType(Float32Array);

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

		let len = this._unitList.length;
		for(let i = 0; i < len; i ++) {
			this._unitList[i].draw();
		}
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
			// console.log(this._vpmat4);
			// gl.uniformMatrix4fv(vpmLocal, false, new Float32Array([
			// 	1.0, 0.0, 0.0, 0.0,
			// 	0.0, 1.0, 0.0, 0.0,
			// 	0.0, 0.0, 1.0, 0.0,
			// 	0.002, 0.002, 0.0, 1.0,
			// ]));
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

// 属性
export const enum RenderAttribute {
	BACKGROUND_COLOR = 'bgColor',
	UV_RECT = 'uvRect',
	OFFSET = 'offset',
	Z_ORDER = 'zOrder',
	TRANSFORM_VALUE = 'transformValue',
}

export class RenderUnit {

	private _engine: Engine;
	private idlist: Map<string, number>;
	private _mesh: Mesh;
	private primitiveMode;
	private vao;
	private instanceCount: number = 0;
	private num: number = 0;
	private pointCount: number = 0;

	private vertexBuffer: WebGLBuffer;
	private transformBuffer: WebGLBuffer;
	private uvBuffer: WebGLBuffer;
	private indecesBuffer: WebGLBuffer;
	private uvRectBuffer: WebGLBuffer;
	private bgColorBuffer: WebGLBuffer;
	private offsetBuffer: WebGLBuffer;
	private zOrderBuffer: WebGLBuffer;
	private transformValueBuffer: WebGLBuffer;

	private vertexBufferData: Float32Array;
	private transformBufferData: Float32Array;
	private uvBufferData: Float32Array;
	private indecesBufferData: Uint32Array;
	private uvRectBufferData: Float32Array;
	private bgColorBufferData: Float32Array;
	private offsetBufferData: Float32Array;
	private zOrderBufferData: Float32Array;
	private transformValueBufferData: Float32Array;

	private offsetIsModified: boolean = false;
	private bgColorIsModified: boolean = false;
	private uvIsModified: boolean = false;
	private zOrderIsModified: boolean = false;
	private transformValueIsModified: boolean = false;

	constructor(engine: Engine, mesh: Mesh) {
		this._mesh = mesh;
		this._engine = engine;

		const gl = engine.gl;
		const vertexes: number[] = mesh.vertexes;

		this.primitiveMode = GL_PRIMITIVE_MODES.get(mesh.primitiveMode);
		this.pointCount = vertexes.length / 3 / 2;

		this.vertexBufferData = new Float32Array(vertexes);
		this.transformBufferData = new Float32Array(this._mesh.transfroms);
		this.uvBufferData = new Float32Array(this._mesh.uv);
		this.indecesBufferData = new Uint32Array(mesh.indeces);
		this.uvRectBufferData = new Float32Array(MAX_INSTANCE*4);
		this.bgColorBufferData = new Float32Array(MAX_INSTANCE*4);
		this.offsetBufferData = new Float32Array(MAX_INSTANCE*2);
		this.transformValueBufferData = new Float32Array(MAX_INSTANCE);
		this.zOrderBufferData = new Float32Array(MAX_INSTANCE);

		this.uvRectBufferData.fill(0);
		this.bgColorBufferData.fill(0);
		this.offsetBufferData.fill(0);
		this.transformValueBufferData.fill(0);
		this.zOrderBufferData.fill(1);

		this.idlist = new Map<string, number>();
	}

	public regist(): RenderUnit {
		const gl = this._engine.gl;
		const prg = this._engine.prg;

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		const vFSIZE = this.vertexBufferData.BYTES_PER_ELEMENT;
		//顶点
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexBufferData, gl.STATIC_DRAW);
		const vertexLocal = gl.getAttribLocation(prg, 'aVertexPosition');
		gl.vertexAttribPointer(vertexLocal, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexLocal);

		//动态变形系数
		this.transformBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.transformBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.transformBufferData, gl.STATIC_DRAW);
		const transformLocal = gl.getAttribLocation(prg, 'aTransformRatio');
		gl.vertexAttribPointer(transformLocal, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(transformLocal);
		// //UV向量
		this.uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.uvBufferData, gl.STATIC_DRAW);
		const uvLocal = gl.getAttribLocation(prg, 'aTextCoord');
		gl.vertexAttribPointer(uvLocal, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(uvLocal);

		this.indecesBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indecesBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indecesBufferData, gl.STATIC_DRAW);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		return this;
	}
	public updateToGL() {
		const gl = this._engine.gl;
		gl.bindVertexArray(this.vao);
		//uv
		if(this.uvIsModified) {
			!this.uvRectBuffer && (this.uvRectBuffer = gl.createBuffer());
			this.updateBufferToGL('aUVRect', this.uvRectBuffer, this.uvRectBufferData, 4, 0);
		}
		//offset
		if(this.offsetIsModified) {
			!this.offsetBuffer && (this.offsetBuffer = gl.createBuffer());
			this.updateBufferToGL('aOffset', this.offsetBuffer, this.offsetBufferData, 2, 0);
		}
		//color
		if(this.bgColorIsModified) {
			!this.bgColorBuffer && (this.bgColorBuffer = gl.createBuffer());
			this.updateBufferToGL('aBgColor', this.bgColorBuffer, this.bgColorBufferData, 4, 0);
		}

		if(this.transformValueIsModified) {
			!this.transformValueBuffer && (this.transformValueBuffer = gl.createBuffer());
			this.updateBufferToGL('aTransformValue', this.transformValueBuffer, this.transformValueBufferData, 1, 0);
		}

		if(this.zOrderIsModified) {
			!this.zOrderBuffer && (this.zOrderBuffer = gl.createBuffer());
			this.updateBufferToGL('aZOrder', this.zOrderBuffer, this.zOrderBufferData, 1, 0);
		}

		this.uvIsModified = false;
		this.offsetIsModified = false;
		this.bgColorIsModified = false;
		this.zOrderIsModified = false;
		this.transformValueIsModified = false;
	}

	public setAttribute(id: string, attrib: RenderAttribute, value: number[]) {
		const idx = this.idlist.get(id);
		let bufferData: Float32Array;
		let stride: number;
		switch(attrib) {
			case RenderAttribute.BACKGROUND_COLOR:
				bufferData = this.bgColorBufferData;
				stride = 4;
				this.bgColorIsModified = true;
				break;
			case RenderAttribute.UV_RECT:
				bufferData = this.uvRectBufferData;
				stride = 4;
				this.uvIsModified = true;
				break;
			case RenderAttribute.OFFSET:
				bufferData = this.offsetBufferData;
				stride = 2;
				this.offsetIsModified = true;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				this.zOrderIsModified = true;
				break;
			case RenderAttribute.TRANSFORM_VALUE:
				bufferData = this.transformValueBufferData;
				stride = 1;
				this.transformValueIsModified = true;
				break;
			default:
				console.error('Attribute type not be surported.');
				break;
		}
		bufferData.set(value.slice(0, stride), idx*stride);
	}

	public getAttribute(id: string, attrib: RenderAttribute): number[] {
		const idx = this.idlist.get(id);
		let stride: number;
		let bufferData: Float32Array;
		switch(attrib) {
			case RenderAttribute.BACKGROUND_COLOR:
				bufferData = this.bgColorBufferData;
				stride = 4;
				break;
			case RenderAttribute.UV_RECT:
				bufferData = this.uvRectBufferData;
				stride = 4;
				break;
			case RenderAttribute.OFFSET:
				bufferData = this.offsetBufferData;
				stride = 2;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				break;
			case RenderAttribute.TRANSFORM_VALUE:
				bufferData = this.transformValueBufferData;
				stride = 1;
				break;
		}

		return Array.from(bufferData.slice(idx*stride, (idx+1)*stride));
	}

	public add(): string {
		const id = this.createId();
		const idx = this.instanceCount;
		this.idlist.set(id, idx);

		//初始化属性
		this.setAttribute(id, RenderAttribute.OFFSET, [0,0]);
		this.setAttribute(id, RenderAttribute.BACKGROUND_COLOR, [0,0,0,1]);
		this.setAttribute(id, RenderAttribute.UV_RECT, [0,0,0,0]);
		this.setAttribute(id, RenderAttribute.TRANSFORM_VALUE, [1]);
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

		const attribs = [
			RenderAttribute.OFFSET, 
			RenderAttribute.BACKGROUND_COLOR, 
			RenderAttribute.UV_RECT, 
			RenderAttribute.TRANSFORM_VALUE,
			RenderAttribute.Z_ORDER,
		];

		attribs.forEach((attrib: RenderAttribute) => this.removeAttributeBufferData(id, attrib));

		this.offsetIsModified = true;
		this.bgColorIsModified = true;
		this.uvIsModified = true;
		this.transformValueIsModified = true;
		this.zOrderIsModified = true;

		this.instanceCount --;
	}

	public draw() {
		const gl = this._engine.gl;
		this.updateToGL();
		gl.bindVertexArray(this.vao);
		gl.drawElementsInstanced(this.primitiveMode, this.indecesBufferData.length, gl.UNSIGNED_INT, 0, this.instanceCount);
	}

	public get engine(): Engine {
		return this._engine;
	}

	private createId(): string {
		this.num ++;
		return this.num.toString();
	}

	private updateBufferToGL(attrib: string, buffer: WebGLBuffer, bufferData: Float32Array, size: number, offset: number) {
		const gl = this._engine.gl;
		const prg = this._engine.prg;
		const FSIZE = bufferData.BYTES_PER_ELEMENT;
		const local = gl.getAttribLocation(prg, attrib);
		const t = this.instanceCount;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, bufferData.subarray(0, (t+1)*size), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(local);
		gl.vertexAttribPointer(local, size, gl.FLOAT, false, size*FSIZE, offset*FSIZE);
		gl.vertexAttribDivisor(local, 1);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	private removeAttributeBufferData(id: string, attrib: RenderAttribute) {
		const idx = this.idlist.get(id);
		let bufferData: Float32Array;
		let stride: number;
		let n: number = Math.max(1, this.instanceCount - 1);
		switch(attrib) {
			case RenderAttribute.BACKGROUND_COLOR:
				bufferData = this.bgColorBufferData;
				stride = 4;
				break;
			case RenderAttribute.UV_RECT:
				bufferData = this.uvRectBufferData;
				stride = 4;
				break;
			case RenderAttribute.OFFSET:
				bufferData = this.offsetBufferData;
				stride = 2;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				break;
			case RenderAttribute.TRANSFORM_VALUE:
				bufferData = this.transformValueBufferData;
				stride = 1;
				break;
		}
		let arr = new Array(stride);
		arr.fill(0);
		bufferData.set(bufferData.slice((n-1)*stride, n*stride), idx*stride);
		bufferData.set(arr, (n-1)*stride);
	}

	public get mesh(): Mesh {
		return this._mesh;
	}
}