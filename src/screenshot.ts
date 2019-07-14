import { Engine } from "./engine";
import { Rectangle } from "./utils";
import { ImageTexture } from "./texture";
import * as glMatrix from "../lib/gl-matrix.js"

const mat4 = glMatrix.mat4;
const vec2 = glMatrix.vec2;
const RATIO = window.devicePixelRatio;

export class Screenshot {
    private _engine: Engine;
    private _area: Rectangle = new Rectangle(0,0,0,0);
    private _fbo: WebGLFramebuffer;
    private _rbo: WebGLRenderbuffer;
    private _texture: ImageTexture;
    private _destWidth: number;
    private _destHeight: number;
    private _useTexture: boolean;
    constructor(engine: Engine, destWidth: number, destHeight: number, useTexture: boolean = true) {
        const gl = engine.gl;
        this._engine = engine;
        this._destWidth = destWidth * RATIO;
        this._destHeight = destHeight * RATIO;
        this._useTexture = useTexture;
        useTexture && (this._texture = this._engine.textureFactroy.createTexture(null, destWidth * RATIO, destHeight * RATIO));
        this._fbo = gl.createFramebuffer();
        this._rbo = gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, destWidth * RATIO , destHeight * RATIO);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._rbo);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    public setSourceArea(srcX: number, srcY: number, srcWidth: number, srcHeight: number) {
        const dw = this._destWidth;
        const dh = this._destHeight;
        const dk = dw / dh;
        const sk = srcWidth / srcHeight;
        
        // 当src长宽比例和dest不同时，裁剪src区域
        if(sk > dk) {
            srcWidth = srcHeight * dk;
        } else if(sk < dk) {
            srcHeight = srcWidth / dk;
        }
        
        this._area.x = srcX * RATIO;
        this._area.y = srcY * RATIO;
        this._area.w = srcWidth * RATIO;
        this._area.h = srcHeight * RATIO;
    }

    public get texture(): ImageTexture {
        return this._texture;
    }

    /**
     * 绘制截图
     * @param indexlist 需要绘制的generator层级
     * @param pixels 导出所用的内存空间
     */
    public draw(indexlist: number[] = null, pixels: Uint8Array = null) {
        const engine = this._engine;
        const gl = engine.gl;
        const vp = engine.viewport;
        const tf = engine.textureFactroy;
        // 缓存当前的视口状态
        // const cacheVpmat = mat4.clone(vp.vpmat4);
        const cacheVpScale = vec2.clone(vp.vpScaleVec2);
        const cacheVpTranslation = vec2.clone(vp.vpTranslationVec2);

        const cacheVpSize = vp.getViewportSize();
        const area = this._area;
        const scale = this._destWidth / area.w;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        // 设置成截图所需要的视口状态
        vp.resetTranslationAndScale(-area.x, -area.y, scale);
        vp.setViewportSize(this._destWidth, this._destHeight, false);

        engine.draw(indexlist, true);
        gl.flush();

        // 如果使用材质
        this._useTexture && tf.copyToTexture(this._texture, 0, 0);

        pixels && gl.reacPixels(0, 0, this._destWidth, this._destHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // 恢复状态
        // vp.vpmat4.set(cacheVpmat, 0);
        vp.vpScaleVec2.set(cacheVpScale);
        vp.vpTranslationVec2.set(cacheVpTranslation);
        vp.vpScaleIsModified = true;
        vp.vpTranslationIsModified = true;
        vp.setViewportSize(cacheVpSize[0], cacheVpSize[1], false);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    }
}