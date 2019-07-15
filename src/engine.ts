import { Mesh, PrimitiveMode, MeshConfig } from "./mesh";
import { Rectangle, getBounds, PaintUnitInterface } from "./utils";
import { Searcher } from "./searcher";
import { TextureFactroy } from "./texture";
import { Viewport } from "./viewport";
import * as glMatrix from "../lib/gl-matrix.js"

glMatrix.glMatrix.setMatrixArrayType(Float32Array);

const vsSource = `#version 300 es
	layout(location=1) in vec4 currVertexAndRatio;			//顶点坐标和变形系数
	layout(location=2) in vec4 prevVertexAndRatio;
	layout(location=3) in vec4 nextVertexAndRatio;
	layout(location=4) in vec4 uvAndEdgeOffsetRatio;		//UV
	
	layout(location=5) in vec4 vertexAndEdgeOffsetValueAndNotFollowViewport;	// 顶点形变  边形变值  是否不跟随视口
	layout(location=6) in vec4 UVRect;						//UVRect
	layout(location=7) in vec4 backgroundColor;				//背景色
	layout(location=8) in vec4 translationAndRotation;		//形变
	layout(location=9) in vec4 isTextAndBorderWidthAndDashedAndScale;		//是否渲染文字 以及 文字边框粗细 以及物体边框虚线 缩放
	layout(location=10) in vec4 textBorderColor;			//文字边框颜色
	layout(location=11) in vec4 opacityAndDisplayAndVpScaleAndVpTrans;			//透明度 是否显示 是否跟随视口缩放 是否跟随视口平移 

	out vec2 vTexCoord;				//UV
	out vec4 vBgColor;
	out float vIsText;
	out float vTextBorderWidth;
	out vec4 vTextBorderColor;
	out float vHasTexture;
	out vec4 vPos;
	out float vNotBorder;
	out float vBorderDashed;
	out float vOpacity;
	out float vDisplay;

	uniform vec2 uConversionVec2;	//坐标转换
	uniform vec2 uViewportTranslation;	//视口平移
	uniform vec2 uViewportScale;		//视口缩放
	// uniform mat4 uViewportMatrix;

	mat4 getScaleMatrix(vec2 scale) {
		return mat4(
			scale.x, 0.0, 0.0, 0.0,
			0.0, scale.y, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}

	mat4 getRotationMatrix(float radian) {
		float cost = cos(radian);
		float sint = sin(radian);
		return mat4(
			cost, -sint, 0.0, 0.0,
			sint, cost, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0
		);
	}

	mat4 getTranslationMatrix(vec2 translation) {
		return mat4(
			1.0, 0.0, 0.0, 0.0,
			0.0, 1.0, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			translation.x, translation.y, 0.0, 1.0
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
		vec2 offset = offsetRatio * offsetValue;
		return origin + offset;
	}

	vec2 getFollowViewport() {
		float outViewportStatus = vertexAndEdgeOffsetValueAndNotFollowViewport.w;	//跟随视口状态
		vec3 f = vec3(outViewportStatus - 1.0, outViewportStatus - 2.0, outViewportStatus - 3.0);
		f = step(vec3(0.5, 0.5, 0.5), abs(f));
		return vec2(f.x * f.z, f.y * f.z);
	}

	// 获取缩放矢量
	vec2 getScaleVec(float scale, vec2 followViewport, vec2 notFollowViewport) {
		vec2 scaleVec = vec2(scale, scale);
		vec2 isVpScale = vec2(1.0, 1.0) - opacityAndDisplayAndVpScaleAndVpTrans.zz;
		vec2 dscaleVec = vec2(1.0, 1.0) / uViewportScale * scaleVec * isVpScale + scaleVec * (1.0-isVpScale);
		return dscaleVec * followViewport + scaleVec * notFollowViewport;
	}

	void main(void) {

		vec2 pv = getVertex(prevVertexAndRatio.xy, prevVertexAndRatio.zw, vertexAndEdgeOffsetValueAndNotFollowViewport.xy);
		vec2 cv = getVertex(currVertexAndRatio.xy, currVertexAndRatio.zw, vertexAndEdgeOffsetValueAndNotFollowViewport.xy);
		vec2 nv = getVertex(nextVertexAndRatio.xy, nextVertexAndRatio.zw, vertexAndEdgeOffsetValueAndNotFollowViewport.xy);
		vec2 pe = pv - cv;
		vec2 ne = nv - cv;

		// 求相邻两边交点向量
		vec2 intersection = getIntersectionVertex(pe, ne, vertexAndEdgeOffsetValueAndNotFollowViewport.z * uvAndEdgeOffsetRatio.z);
		
		// 判断是否需要乘视口矩阵
		vec2 followViewport = getFollowViewport();
		vec2 notFollowViewport = vec2(1.0, 1.0) - followViewport;

		// 各种矩阵
		mat4 rotationMatrix = getRotationMatrix(translationAndRotation.z);
		mat4 scaleMatrix = getScaleMatrix(getScaleVec(isTextAndBorderWidthAndDashedAndScale.w, followViewport, notFollowViewport));
		mat4 transMat = getScaleMatrix(uConversionVec2.xy) * getTranslationMatrix(translationAndRotation.xy) * rotationMatrix;
		mat4 vpScaleMatrix = getScaleMatrix(uViewportScale);
		mat4 vpTranslationMatrix = getTranslationMatrix(uViewportTranslation);
		
		vec4 pos1 = transMat * scaleMatrix * vec4(cv, 0.0, 1.0);
		vec4 pos2 = vpTranslationMatrix * vpScaleMatrix * pos1;
		vec4 pos3 = transMat * vec4(intersection, 0.0, 0.0);
		vec2 pos = pos2.xy * followViewport + pos1.xy * notFollowViewport;

		gl_Position = vec4(pos, 0.0, 1.0) + pos3;

		// out
		// 如果材质宽度为0 则标志为无材质 
		vHasTexture = step(0.0, UVRect.z);
		vTexCoord = uvAndEdgeOffsetRatio.xy * UVRect.zw + UVRect.xy;
		vBgColor = backgroundColor;
		vIsText = isTextAndBorderWidthAndDashedAndScale.x;
		vTextBorderWidth = isTextAndBorderWidthAndDashedAndScale.y;
		vTextBorderColor = textBorderColor;
		vNotBorder = step(vertexAndEdgeOffsetValueAndNotFollowViewport.z, 0.0);
		vPos = rotationMatrix * vec4(cv, 0, 1);
		vBorderDashed = isTextAndBorderWidthAndDashedAndScale.z;	
		vOpacity = opacityAndDisplayAndVpScaleAndVpTrans.x;
		vDisplay = opacityAndDisplayAndVpScaleAndVpTrans.y;
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
	in float vOpacity;
	in float vDisplay;
	out vec4 fragColor;

	float inBorderDashed() {

		// 是否绘制虚线
		float hasDashed = step(0.0, vBorderDashed);

		vec2 fw = fwidth(vPos.xy);
		float k = fw.y * (1.0/fw.x);

		// 如果k在 0.95 和 1.05 之间
		float c1 = step(0.95, k) * step(k, 1.05);
		// 如果 c1 == 0.1 则 c2 = 0.0 否则 c2 = 1.0
		float c2 = 1.0 - c1;
		// 如果 c1 条件成立 则 gl_FragCoord.x 否则 ...
		float d = gl_FragCoord.x * c1 + (step(1.0, k) * gl_FragCoord.y + step(k, 1.0) * gl_FragCoord.x) * c2;

		return mod(floor( d * (1.0/vBorderDashed) ), 2.0) * (1.0/hasDashed);
	}

	vec4 drawText(vec4 texture) {
		// 文字边框是否大于0
		float c1 = step(0.1, vTextBorderWidth);
		// 文字边框是否小于等于0
		float c2 = 1.0 - c1;

		// 第一个插值阶梯
		float start = max(0.0, 0.5 - vTextBorderWidth * 0.1);
		// 边框插值系数
	float r1 = smoothstep(start, start + 0.2, texture.r) * c1;
		// 文字插值系数
		float r2 = smoothstep(0.5, 0.85, texture.r);
		
		return vec4(mix(vTextBorderColor.rgb, vBgColor.rgb, r2), r2+(1.0-r2)*r1);
	}

	vec4 drawNormal(vec4 texture) {
		float a1 = texture.a * vHasTexture;
		float a2 = vBgColor.a;
		return vec4(mix(vBgColor.rgb, texture.rgb, a1), a1+(1.0-a1)*a2);
	}

	void main(void) {

		if(vDisplay == 0.0 || vOpacity == 0.0 || inBorderDashed() == 0.0) {
			discard;
			return;
		}

		// 材质
		vec4 tColor = texture(uSampler, vTexCoord);
		// 绘制字体
		vec4 textColor = drawText(tColor);
		// 绘制普通对象
		vec4 normalColor = drawNormal(tColor);

		vec4 color = vIsText * textColor + (1.0 - vIsText) * normalColor;
		color.a *= vOpacity;

		fragColor = color;
	}
`;

export class Engine {
	private _gl;
	private _prg;
	private _searcher;
	private _tf: TextureFactroy;
	private _vp: Viewport;
	private _unitList: PaintUnitInterface[][];
	public isDebug: boolean = true;
	public canRending: boolean = true;
	constructor(canvas) {
		this._gl = canvas.getContext('webgl2', { 
			alpha: false,
			premultiplyAlpha: false,	//关闭al
			antialias: true,
		 });
		this._unitList = [];
		this._searcher = new Searcher();
		this._tf = new TextureFactroy(this._gl);
		this._vp = new Viewport(this._gl);
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
	public get textureFactroy(): TextureFactroy {
		return this._tf;
	}
	public get viewport(): Viewport {
		return this._vp;
	}
	
	/**
	 * 绘制
	 * @param indexlist 需要绘制的层级
	 * @param isForce 是否强制绘制，否则如果数据无变化就不绘制
	 */
	public draw(indexlist: number[] = null, isForce: boolean = false) {
		const gl = this.gl;
		const r1 = this.updateViewport();
		const r2 = this.updateConversionVec();
		let r3 = false;
		this._unitList.forEach((units, k) => {
			if(!indexlist || (indexlist && indexlist.indexOf(k) >= 0)) {
				units.forEach(unit => {
					if(unit.updateToGL()) {
						r3 = true;
					}
				});
			}
		});
		if(isForce || (r1 || r2 || r3)) {
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
		if(!this.canRending) return;
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
	// private updateViewportMat(): boolean {
	// 	if(this._vp.vpMatIsModified) {
	// 		const gl = this.gl;
	// 		const vpmLocal = gl.getUniformLocation(this.prg, 'uViewportMatrix');
	// 		gl.uniformMatrix4fv(vpmLocal, false, this._vp.vpmat4);
	// 		this._vp.vpMatIsModified = false;
	// 		return true;
	// 	}
	// 	return false;
	// }

	private updateViewport(): boolean {
		const gl = this.gl;
		let result = false;
		if(this._vp.vpScaleIsModified) {
			const vpScaleLocal = gl.getUniformLocation(this.prg, 'uViewportScale');
			gl.uniform2fv(vpScaleLocal, this._vp.vpScaleVec2);
			this._vp.vpScaleIsModified = false;
			result = true;
		}

		if(this._vp.vpTranslationIsModified) {
			const vpTranslationLocal = gl.getUniformLocation(this.prg, 'uViewportTranslation');
			gl.uniform2fv(vpTranslationLocal, this._vp.vpTranslationVec2);
			this._vp.vpTranslationIsModified = false;
			result = true;
		}

		return result;
	}

	// 更新坐标变换矢量
	private updateConversionVec(): boolean {
		if(this._vp.cvMatIsModified) {
			const gl = this.gl;
			const cvLocal = gl.getUniformLocation(this.prg, 'uConversionVec2');
			gl.uniform2fv(cvLocal, this._vp.cvec2);
			this._vp.cvMatIsModified = false;
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
