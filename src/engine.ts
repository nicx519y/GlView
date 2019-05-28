import { MeshUnit, Mesh, PrimitiveMode } from "./mesh";

const vsSource = `
	attribute vec2 aVertexPosition;		//顶点坐标
	attribute float aVertexRatio; 		//坐标系数
	attribute vec2 aVertexOffset;		//边框顶点偏移矢量
	attribute vec2 aVertexDynamicRatio;	//顶点动态变形系数
	attribute vec2 aTextCoord;			//UV
	attribute vec4 aUVRect;				//UVRect
	attribute vec4 aBgColor;			//背景色
	attribute vec2 aOffset;				//偏移
	attribute float aZOrder;			//z
	attribute float borderWidth;		//边框粗细
	varying vec2 vTexCoord;				//UV
	varying vec4 vBgColor;
	uniform mat4 uViewportMatrix;		//视口矩阵
	uniform mat4 uConversionMatrix;		//坐标转换矩阵
	
	void main(void) {
		vTexCoord = vec2(aTextCoord.x * aUVRect.p + aUVRect.s, aTextCoord.y * aUVRect.q + aUVRect.t);
		vec4 pos = vec4(aVertexPosition + aVertexRatio * aVertexDynamicRatio + aOffset, 0, 1);
		vec4 borderVec = vec4(aVertexOffset * borderWidth, aZOrder, 0);
		vec4 position = uViewportMatrix * pos + borderVec;
		gl_Position = uConversionMatrix * position;
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


export class Engine {
	private _gl;
	private _prg;
	private _vpmat4;
	private _cvMat4;
	private _vpmatIsModify: boolean = true;
	private _conversionIsModify: boolean = true;
	private _bgColor: number[];
	private _unitList: RenderUnit[];
	constructor(canvas) {
		this._gl = canvas.getContext('webgl2');

		this._vpmat4 = new Matrix4(null);
		this._vpmat4.setScale(1,1,1);

		this._cvMat4 = new Matrix4(null);
		this._cvMat4.setScale(1/canvas.width*2,1/canvas.height*2,1);

		this._bgColor = [0,0,0,1];
		this._unitList = [];

		this.initPrg();
	}

	public get gl() {
		return this._gl;
	}
	public get prg() {
		return this._prg;
	}

	// 视口矩阵
	public get vpMat4() {
		return this._vpmat4;
	}

	// 变换矩阵
	public get cvMat4() {
		return this._cvMat4;
	}

	public set vpMatIsModify(is: boolean) {
		this._vpmatIsModify = is;
	}

	public set cvMatIsModify(is: boolean) {
		this._conversionIsModify = is;
	}

	public set bgColor(color: number[]) {
		this._bgColor = color;
	}

	// 渲染
	public draw() {
		const gl = this.gl;
		this.updateViewportMat();
		this.updateConversionMat();
		
		gl.clearColor.apply(gl, this._bgColor);
		gl.enable(gl.DEPTH_TEST);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

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
		if(this._vpmatIsModify) {
			const gl = this.gl;
			const vpmLocal = gl.getUniformLocation(this.prg, 'uViewportMatrix');
			gl.uniformMatrix4fv(vpmLocal, false, this.vpMat4.elements);
			this._vpmatIsModify = false;
		}
	}

	// 更新坐标变换矩阵
	private updateConversionMat() {
		if(this._conversionIsModify) {
			const gl = this.gl;
			const cvLocal = gl.getUniformLocation(this.prg, 'uConversionMatrix');
			gl.uniformMatrix4fv(cvLocal, false, this.cvMat4.elements);
			this._conversionIsModify = false;
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
	BORDER_COLOR = 'borderColor',
	BORDER_WIDTH = 'borderWidth',
	Z_ORDER = 'zOrder',
	VERTEX_RATIO = 'aVertexRatio',
}

export class RenderUnit {

	private _engine: Engine;
	private idlist: Map<string, number>;
	private mesh: Mesh;
	private primitiveMode;
	private vao;
	private borderVao;
	private instanceCount: number = 0;
	private num: number = 0;
	private pointCount: number = 0;
	private borderPointCount: number = 0;

	private vertexBuffer: WebGLBuffer;
	private uvRectBuffer: WebGLBuffer;
	private bgColorBuffer: WebGLBuffer;
	private borderVertexBuffer: WebGLBuffer;
	private borderColorBuffer: WebGLBuffer;
	private offsetBuffer: WebGLBuffer;
	private boffsetBuffer: WebGLBuffer;
	private borderWidthBuffer: WebGLBuffer;
	private zOrderBuffer: WebGLBuffer;
	private vertexRatioBuffer: WebGLBuffer;
	private bvertexRatioBuffer: WebGLBuffer;

	private vertexBufferData: Float32Array;
	private uvRectBufferData: Float32Array;
	private bgColorBufferData: Float32Array;
	private borderVertexBufferData: Float32Array;
	private borderColorBufferData: Float32Array;
	private offsetBufferData: Float32Array;
	private borderWidthBufferData: Float32Array;
	private zOrderBufferData: Float32Array;
	private vertexRatioBufferData: Float32Array;

	private offsetIsModified: boolean = false;
	private bgColorIsModified: boolean = false;
	private uvIsModified: boolean = false;
	private borderColorIsModified: boolean = false;
	private borderWidthIsModified: boolean = false;
	private zOrderIsModified: boolean = false;
	private vertexRatioIsModified: boolean = false;

	constructor(engine: Engine, mesh: Mesh) {
		this.mesh = mesh;
		this._engine = engine;

		const meshUnit: MeshUnit = mesh.unit;
		const meshBorderUnit: MeshUnit = mesh.borderUnit;
		const vertexes: number[] = meshUnit.vertexes;
		const borderVertexes: number[] = meshBorderUnit.vertexes;
		const gl = engine.gl;

		switch(meshUnit.primitiveMode) {
			case PrimitiveMode.TRIANGLE_FAN:
				this.primitiveMode = gl.TRIANGLE_FAN;
				break;
			default:
				this.primitiveMode = gl.TRIANGLE_STRIP;
				break;
		}

		this.vertexBufferData = new Float32Array(meshUnit.vertexes);
		this.uvRectBufferData = new Float32Array(MAX_INSTANCE*4);
		this.bgColorBufferData = new Float32Array(MAX_INSTANCE*4);
		this.offsetBufferData = new Float32Array(MAX_INSTANCE*2);
		// vertexes中包含 点坐标 x,y dymnmic 点偏移 offsetx, offsety UV u, v 所以点的数量是 /4/2
		this.pointCount = vertexes.length / 4 / 2;
		this.borderPointCount = borderVertexes.length / 4 / 2;

		this.uvRectBufferData.fill(0);
		this.bgColorBufferData.fill(0);
		this.offsetBufferData.fill(0);

		this.borderVertexBufferData = new Float32Array(borderVertexes);
		this.borderColorBufferData = new Float32Array(MAX_INSTANCE*4);
		this.borderWidthBufferData = new Float32Array(MAX_INSTANCE);

		this.borderColorBufferData.fill(0);
		this.borderWidthBufferData.fill(0);

		this.vertexRatioBufferData = new Float32Array(MAX_INSTANCE);
		this.vertexRatioBufferData.fill(1);

		this.zOrderBufferData = new Float32Array(MAX_INSTANCE);
		this.zOrderBufferData.fill(1);

		this.idlist = new Map<string, number>();
	}

	public regist(): RenderUnit {
		const gl = this._engine.gl;
		const prg = this._engine.prg;

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		const vFSIZE = this.vertexBufferData.BYTES_PER_ELEMENT;
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexBufferData, gl.STATIC_DRAW);
		//顶点
		const vertexLocal = gl.getAttribLocation(prg, 'aVertexPosition');
		gl.vertexAttribPointer(vertexLocal, 2, gl.FLOAT, false, 8*vFSIZE, 0);
		gl.enableVertexAttribArray(vertexLocal);
		//动态变形系数
		const dynamicRatioLocal = gl.getAttribLocation(prg, 'aVertexDynamicRatio');
		gl.vertexAttribPointer(dynamicRatioLocal, 2, gl.FLOAT, false, 8*vFSIZE, 2*vFSIZE);
		gl.enableVertexAttribArray(dynamicRatioLocal);

		//顶点偏移 
		const vertexOffsetLocal = gl.getAttribLocation(prg, 'aVertexOffset');
		gl.vertexAttribPointer(vertexOffsetLocal, 2, gl.FLOAT, false, 8*vFSIZE, 4*vFSIZE);
		gl.enableVertexAttribArray(vertexOffsetLocal);
		// //UV向量
		const uvLocal = gl.getAttribLocation(prg, 'aTextCoord');
		gl.vertexAttribPointer(uvLocal, 2, gl.FLOAT, false, 8*vFSIZE, 6*vFSIZE);
		gl.enableVertexAttribArray(uvLocal);

		////////////////////////////////////////////////////////
		//////////////// 边框顶点初始化 ///////////////////
		////////////////////////////////////////////////////////

		this.borderVao = gl.createVertexArray();
		gl.bindVertexArray(this.borderVao);

		this.borderVertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.borderVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.borderVertexBufferData, gl.STATIC_DRAW);
		
		const bVertexlocal = gl.getAttribLocation(prg, 'aVertexPosition');
		gl.vertexAttribPointer(bVertexlocal, 2, gl.FLOAT, false, 8*vFSIZE, 0);
		gl.enableVertexAttribArray(bVertexlocal);

		//动态变形系数
		const bDynamicRatioLocal = gl.getAttribLocation(prg, 'aVertexDynamicRatio');
		gl.vertexAttribPointer(bDynamicRatioLocal, 2, gl.FLOAT, false, 8*vFSIZE, 2*vFSIZE);
		gl.enableVertexAttribArray(bDynamicRatioLocal);

		const bVertexOffsetLocal = gl.getAttribLocation(prg, 'aVertexOffset');
		gl.vertexAttribPointer(bVertexOffsetLocal, 2, gl.FLOAT, false, 8*vFSIZE, 4*vFSIZE);
		gl.enableVertexAttribArray(bVertexOffsetLocal);

		const bUvLocal = gl.getAttribLocation(prg, 'aTextCoord');
		gl.vertexAttribPointer(bUvLocal, 2, gl.FLOAT, false, 8*vFSIZE, 6*vFSIZE);
		gl.enableVertexAttribArray(bUvLocal);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
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

		if(this.vertexRatioIsModified) {
			!this.vertexRatioBuffer && (this.vertexRatioBuffer = gl.createBuffer());
			this.updateBufferToGL('aVertexRatio', this.vertexRatioBuffer, this.vertexRatioBufferData, 1, 0);
		}

		if(this.zOrderIsModified) {
			!this.zOrderBuffer && (this.zOrderBuffer = gl.createBuffer());
			this.updateBufferToGL('aZOrder', this.zOrderBuffer, this.zOrderBufferData, 1, 0);
		}

		gl.bindVertexArray(this.borderVao);

		if(this.borderColorIsModified) {
			!this.borderColorBuffer && (this.borderColorBuffer = gl.createBuffer());
			this.updateBufferToGL('aBgColor', this.borderColorBuffer, this.borderColorBufferData, 4, 0);
		}

		if(this.borderWidthIsModified) {
			!this.borderWidthBuffer && (this.borderWidthBuffer = gl.createBuffer());
			this.updateBufferToGL('borderWidth', this.borderWidthBuffer, this.borderWidthBufferData, 1, 0);
		}

		if(this.offsetIsModified) {
			!this.boffsetBuffer && (this.boffsetBuffer = gl.createBuffer());
			this.updateBufferToGL('aOffset', this.boffsetBuffer, this.offsetBufferData, 2, 0);
		}

		if(this.vertexRatioIsModified) {
			!this.bvertexRatioBuffer && (this.bvertexRatioBuffer = gl.createBuffer());
			this.updateBufferToGL('aVertexRatio', this.bvertexRatioBuffer, this.vertexRatioBufferData, 1, 0);
		}

		if(this.zOrderIsModified) {
			!this.zOrderBuffer && (this.zOrderBuffer = gl.createBuffer());
			this.updateBufferToGL('aZOrder', this.zOrderBuffer, this.zOrderBufferData, 1, 0);
		}

		this.uvIsModified = false;
		this.offsetIsModified = false;
		this.bgColorIsModified = false;
		this.borderColorIsModified = false;
		this.borderWidthIsModified = false;
		this.vertexRatioIsModified = false;
		this.zOrderIsModified = false;
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
			case RenderAttribute.BORDER_COLOR:
				bufferData = this.borderColorBufferData;
				stride = 4;
				this.borderColorIsModified = true;
				break;
			case RenderAttribute.BORDER_WIDTH:
				bufferData = this.borderWidthBufferData;
				stride = 1;
				this.borderWidthIsModified = true;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				this.zOrderIsModified = true;
				break;
			case RenderAttribute.VERTEX_RATIO:
				bufferData = this.vertexRatioBufferData;
				stride = 1;
				this.vertexRatioIsModified = true;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				this.zOrderIsModified = true;
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
			case RenderAttribute.BORDER_COLOR:
				bufferData = this.borderColorBufferData;
				stride = 4;
				break;
			case RenderAttribute.BORDER_WIDTH:
				bufferData = this.borderWidthBufferData;
				stride = 1;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				break;
			case RenderAttribute.VERTEX_RATIO:
				bufferData = this.vertexRatioBufferData;
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
		this.setAttribute(id, RenderAttribute.BORDER_COLOR, [0,0,0,1]);
		this.setAttribute(id, RenderAttribute.BORDER_WIDTH, [0]);
		this.setAttribute(id, RenderAttribute.VERTEX_RATIO, [1]);
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
			RenderAttribute.BORDER_COLOR, 
			RenderAttribute.BORDER_WIDTH,
			RenderAttribute.VERTEX_RATIO,
			RenderAttribute.Z_ORDER,
		];

		attribs.forEach((attrib: RenderAttribute) => this.removeAttributeBufferData(id, attrib));

		this.offsetIsModified = true;
		this.bgColorIsModified = true;
		this.uvIsModified = true;
		this.borderColorIsModified = true;
		this.borderWidthIsModified = true;
		this.vertexRatioIsModified = true;

		this.instanceCount --;
	}

	public draw() {
		const gl = this._engine.gl;
		this.updateToGL();
		gl.bindVertexArray(this.borderVao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, this.borderPointCount, this.instanceCount);
		gl.bindVertexArray(this.vao);
		gl.drawArraysInstanced(this.primitiveMode, 0, this.pointCount, this.instanceCount);
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
			case RenderAttribute.BORDER_COLOR:
				bufferData = this.borderColorBufferData;
				stride = 4;
				break;
			case RenderAttribute.BORDER_WIDTH:
				bufferData = this.borderWidthBufferData;
				stride = 1;
				break;
			case RenderAttribute.Z_ORDER:
				bufferData = this.zOrderBufferData;
				stride = 1;
				break;
			case RenderAttribute.VERTEX_RATIO:
				bufferData = this.vertexRatioBufferData;
				stride = 1;
				break;
		}
		let arr = new Array(stride);
		arr.fill(0);
		bufferData.set(bufferData.slice((n-1)*stride, n*stride), idx*stride);
		bufferData.set(arr, (n-1)*stride);
	}
}