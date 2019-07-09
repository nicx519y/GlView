import { Mesh, PrimitiveMode, MeshConfig } from "./mesh";
import { Rectangle, getBounds, PaintUnitInterface } from "./utils";
import { Searcher } from "./searcher";
import * as glMatrix from "../lib/gl-matrix.js";

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const vec2 = glMatrix.vec2;
glMatrix.glMatrix.setMatrixArrayType(Float32Array);

const vsSource = `#version 300 es
	layout(location=1) in vec4 currVertexAndRatio;			//顶点坐标和变形系数
	layout(location=2) in vec4 prevVertexAndRatio;
	layout(location=3) in vec4 nextVertexAndRatio;
	layout(location=4) in vec4 uvAndEdgeOffsetRatio;		//UV
	
	layout(location=5) in vec4 vertexAndEdgeOffsetValue;	//变形值
	layout(location=6) in vec4 UVRect;						//UVRect
	layout(location=7) in vec4 backgroundColor;				//背景色
	layout(location=8) in vec4 translationAndRotation;		//形变
	layout(location=9) in vec4 isTextAndBorderWidthAndDashedAndScale;		//是否渲染文字 以及 文字边框粗细 以及物体边框虚线 缩放
	layout(location=10) in vec4 textBorderColor;			//文字边框颜色

	out vec2 vTexCoord;				//UV
	out vec4 vBgColor;
	out float vIsText;
	out float vTextBorderWidth;
	out vec4 vTextBorderColor;
	out float vHasTexture;
	out vec4 vPos;
	out float vNotBorder;
	out float vBorderDashed;

	uniform mat4 uViewportMatrix;	//视口矩阵
	uniform vec2 uConversionVec2;	//坐标转换

	mat4 getScaleMatrix() {
		return mat4(
			isTextAndBorderWidthAndDashedAndScale.w, 0.0, 0.0, 0.0,
			0.0, isTextAndBorderWidthAndDashedAndScale.w, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}
	
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
			translationAndRotation.x, translationAndRotation.y, 0.0, 1.0
		);
	}

	mat4 getRotationMatrix() {
		float cost = cos(translationAndRotation.z);
		float sint = sin(translationAndRotation.z);
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
		vec3 vv1 = vec3(v1, 0);
		vec3 vv2 = vec3(v2, 0);
		// 向量夹角
		vec2 mid = normalize(normalize(v1) + normalize(v2));
		float theta = acos(dot(v1, v2) / (length(v1) * length(v2)));
		// 右手法则，判断夹角正负
		vec3 c = cross(vv1, vv2);
		float l = offset / sin(theta * 0.5);
		return mid * l * (- sign(c.z));
	}

	vec2 getVertex(
		in vec2 origin,
		in vec2 offsetRatio,
		in vec2 offsetValue
	) {
		vec2 offset = vec2(offsetRatio.x * offsetValue.x, offsetRatio.y * offsetValue.y);
		return origin + offset;
	}

	void main(void) {

		vec2 pv = getVertex(prevVertexAndRatio.xy, prevVertexAndRatio.zw, vertexAndEdgeOffsetValue.xy);
		vec2 cv = getVertex(currVertexAndRatio.xy, currVertexAndRatio.zw, vertexAndEdgeOffsetValue.xy);
		vec2 nv = getVertex(nextVertexAndRatio.xy, nextVertexAndRatio.zw, vertexAndEdgeOffsetValue.xy);
		vec2 pe = pv - cv;
		vec2 ne = nv - cv;
		mat4 rotationMatrix = getRotationMatrix();
		mat4 scaleMatrix = getScaleMatrix();
		mat4 transMat = getConversionMatrix() * getTranslationMatrix() * rotationMatrix;
		// 求相邻两边交点向量
		vec2 intersection = getIntersectionVertex(pe, ne, vertexAndEdgeOffsetValue.z * uvAndEdgeOffsetRatio.z);
		
		gl_Position = uViewportMatrix * transMat * scaleMatrix * vec4(cv, 0, 1) + transMat * vec4(intersection, 0, 0);

		// out
		// 如果材质宽度为0 则标志为无材质 
		vHasTexture = step(pow(10.0, -9.0), UVRect.z);
		vTexCoord = vec2(uvAndEdgeOffsetRatio.x * UVRect.p + UVRect.s, uvAndEdgeOffsetRatio.y * UVRect.q + UVRect.t);
		vBgColor = backgroundColor;
		vIsText = isTextAndBorderWidthAndDashedAndScale.x;
		vTextBorderWidth = isTextAndBorderWidthAndDashedAndScale.y;
		vTextBorderColor = textBorderColor;
		vNotBorder = step(vertexAndEdgeOffsetValue.z, 0.0);
		vPos = rotationMatrix * vec4(cv, 0, 1);
		vBorderDashed = isTextAndBorderWidthAndDashedAndScale.z;	
	}
`;

const fsSource = `#version 300 es
	precision mediump float;
	uniform sampler2D uSampler;
	// uniform vec2 uConversionVec2;	//坐标转换
	in vec2 vTexCoord;
	in vec4 vBgColor;
	in float vIsText;
	in float vTextBorderWidth;
	in vec4 vTextBorderColor;
	in float vHasTexture;
	in vec4 vPos;
	in float vNotBorder;
	in float vBorderDashed;
	out vec4 fragColor;

	float inBorderDashed() {

		// 是否绘制虚线
		float hasDashed = step(0.0, vBorderDashed);

		vec2 fw = fwidth(vPos.xy);
		float k = fw.y * (1.0/fw.x);

		// 如果k在 0.95 和 1.05 之间
		float c1 = step(0.95, k) * step(k, 1.05);
		// 如果 c1 == 0.1 则 c2 = 0.0 否则 c2 = 1.0
		float c2 = step(c1, 0.5);
		// 如果 c1 条件成立 则 gl_FragCoord.x 否则 ...
		float d = gl_FragCoord.x * c1 + (step(1.0, k) * gl_FragCoord.y + step(k, 1.0) * gl_FragCoord.x) * c2;

		return mod(floor( d * (1.0/vBorderDashed) ), 2.0) * (1.0/hasDashed);
	}

	vec4 drawText(vec4 texture) {
		// 文字边框是否大于0
		float c1 = step(0.1, vTextBorderWidth);
		// 文字边框是否小于等于0
		float c2 = step(c1, 0.5);

		// 第一个插值阶梯
		float start = max(0.0, 0.6 - vTextBorderWidth * 0.1);
		// 边框插值系数
		float r1 = smoothstep(start, start + 0.2, texture.r) * c1;
		// 文字插值系数
		float r2 = smoothstep(0.6, 0.8, texture.r);
		
		return vec4(mix(vTextBorderColor.rgb, vBgColor.rgb, r2), r2+(1.0-r2)*r1);
	}

	vec4 drawNormal(vec4 texture) {
		float a1 = texture.a * vHasTexture;
		float a2 = vBgColor.a;
		return vec4(mix(vBgColor.rgb, texture.rgb, a1), a1+(1.0-a1)*a2);
	}

	void main(void) {
		if(inBorderDashed() == 0.0) {
			discard;
			return;
		}

		// 材质
		vec4 tColor = texture(uSampler, vTexCoord);
		// 绘制字体
		vec4 textColor = drawText(tColor);
		// 绘制普通对象
		vec4 normalColor = drawNormal(tColor);

		fragColor = vIsText * textColor + step(vIsText, 0.5) * normalColor;
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
	private _unitList: PaintUnitInterface[][];
	private _num: number = 0;
	constructor(canvas) {
		const ratio = window.devicePixelRatio;
		const width = canvas.width;
		const height = canvas.height;
		this._gl = canvas.getContext('webgl2', { 
			alpha: false,
			premultiplyAlpha: false,	//关闭al
			antialias: true,
		 });
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
		const gl = this.gl;
		this._bgColor = color;
		gl.clearColor.apply(gl, this._bgColor);
	}
	
	// 渲染
	public draw() {
		const gl = this.gl;
		const r1 = !this.updateViewportMat();
		const r2 = !this.updateConversionVec();
		let r3 = true;
		this._unitList.forEach(units => units.forEach(unit => r3 = r3 && (!unit.updateToGL())));
		if(!(r1 && r2 && r3)) {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			this._unitList.forEach(units => units.forEach(unit => unit.draw()));
		}
	}

	public registVAO(unit: PaintUnitInterface, index: number = 0) {
		if(!this._unitList[index]) {
			this._unitList[index] = [];
		}
		this._unitList[index].push(unit);
		return unit;
	}

	public unRegistVAO(unit: PaintUnitInterface, index: number = 0) {
		if(index >= this._unitList.length) return;
		const idx = this._unitList[index].indexOf(unit);
		if(idx < 0) return;
		this._unitList[index].splice(idx, 1);
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
		//打开透明度混合
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_DST_COLOR);
		// gl.enable(gl.DEPTH_TEST);
	}

	// 更新视口矩阵
	private updateViewportMat(): boolean {
		if(this._vpmatIsModified) {
			const gl = this.gl;
			const vpmLocal = gl.getUniformLocation(this.prg, 'uViewportMatrix');
			gl.uniformMatrix4fv(vpmLocal, false, this._vpmat4);
			this._vpmatIsModified = false;
			return true;
		}
		return false;
	}

	// 更新坐标变换矢量
	private updateConversionVec(): boolean {
		if(this._conversionIsModified) {
			const gl = this.gl;
			const cvLocal = gl.getUniformLocation(this.prg, 'uConversionVec2');
			gl.uniform2fv(cvLocal, this._cvec2);
			this._conversionIsModified = false;
			return true;
		}
		return false;
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
