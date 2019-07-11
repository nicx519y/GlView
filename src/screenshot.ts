import { Engine } from "./engine";
import { Rectangle } from "./utils";
import { ImageTexture } from "./texture";
import * as glMatrix from "../lib/gl-matrix.js"

const mat4 = glMatrix.mat4;

export class Screenshot {
    private _engine: Engine;
    private _viewportScale: number = 1;
    private _area: Rectangle;
    private _fbo: WebGLBuffer;
    private _texture: ImageTexture;
    constructor(engine: Engine, lesSetting: { x: number, y: number, width: number, height: number, scale: number }) {
        this._engine = engine;
        this._area = new Rectangle(lesSetting.x ,lesSetting.y, lesSetting.width, lesSetting.height);
        this._viewportScale = lesSetting.scale;
        this._texture = this._engine.textureFactroy.createTexture(null, lesSetting.width, lesSetting.height);
        this._fbo = engine.gl.createFramebuffer();
    }

    public draw() {
        const engine = this._engine;
        const gl = engine.gl;
        const vp = engine.viewport;
        const tf = engine.textureFactroy;
        // 缓存当前的视口状态
        const cacheVpmat = mat4.clone(vp.vpmat4);
        const cacheVpSize = vp.getViewportSize();
        const area = this._area;
        const scale = this._viewportScale;

        engine.canRending = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        // 设置成截图所需要的视口状态
        vp.resetTranslationAndScale(0, 0, this._viewportScale);
        vp.setViewportSize(area.x + area.w, area.y + area.h, false);

        engine.draw();
        gl.flush();
        tf.copyToTexture(this._texture, area.x, area.y);
        
        // 恢复状态
        vp.vpmat4.set(cacheVpmat, 0);
        vp.setViewportSize(cacheVpSize[0], cacheVpSize[1], false);
        gl.bindFramebuffer(gl.FRAMEBUFFER, 0);
        engine.canRending = true;

    }
}