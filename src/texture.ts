import { GrowingPacker, PNode } from './packer';
import * as TinySDF from 'tiny-sdf';

const TextureConfig = {
	MAX_WIDTH : Math.pow(2, 12),
	MAX_HEIGHT : Math.pow(2, 12),
}

const FontConfig = {
	fontSize: Math.pow(2, 6), 		//生成文字材质尺寸，2的幂，越大质量越好
	fontFamily: 'Black Arial', 
	fontWeight: 'normal',
}

export class TextureFactroy {
	private packer: GrowingPacker;
	private rowy;
	private currx=0;
	private curry=0;
	private engine;
	private ctx2D: CanvasRenderingContext2D;
	private blocks: PNode[] = [];
	private fontMaps: Map<string, ImageTexture> = new Map();
	// 初始化材质
	constructor(engine) {
		this.engine = engine;
		const gl = this.engine.gl;
		const mw = TextureConfig.MAX_WIDTH;
		const mh = TextureConfig.MAX_HEIGHT;
		this.packer = new GrowingPacker(mw, mh);
		this.ctx2D = document.createElement('canvas').getContext('2d');
		//创建不可变材质空间
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//y轴反转
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, mw, mh);
	}

	public createTexture(source: any, width: number, height: number): ImageTexture {
		const t = new ImageTexture();
		this.blocks.push({
			w: width,
			h: height,
			data: {
				source: source,
				texture: t,
			}
		});
		return t;
	}

	public getFontTexture(str: string): ImageTexture {
		const t = str.substr(0, 1);
		if(t == '') return null;
		if(!this.fontMaps.has(t)) {
			this.embedFont(t);
			this.updateToGL();
		}
		return this.fontMaps.get(str);
	}

	public getFontTextures(): Map<string, ImageTexture> {
		return this.fontMaps;
	}

	public embedFont(chars: string) {
		const sdf = new TinySDF(
			FontConfig.fontSize, 
			FontConfig.fontSize/8, 
			FontConfig.fontSize/3, 
			null, 
			FontConfig.fontFamily, 
			FontConfig.fontWeight
		);
		const size = sdf.size;
		
		for(let i = 0; i < chars.length; i ++) {
			let char = chars[i];
			const txt = this.fontMaps.get(char);
			// 步允许重复导入
			if(txt && txt instanceof ImageTexture) {
				continue;
			}
			const s = sdf.draw(char, size);
			let t = new ImageTexture();
			this.blocks.push({
				w: size,
				h: size,
				data: {
					source: s,
					texture: t,
				}
			});
			this.fontMaps.set(char, t);
		}
	}

	public updateToGL() {
		const gl = this.engine.gl;
		this.blocks = this.blocks.sort((a, b) => { 
			if (a.w + a.h > b.w + b.h) return -1;
			return 1;
		});
		this.packer.fit(this.blocks);
		const bs = this.blocks;
		bs.forEach(b => gl.texSubImage2D(gl.TEXTURE_2D, 0, b.fit.x, b.fit.y, b.w, b.h, gl.RGBA, gl.UNSIGNED_BYTE, b.data.source));
		gl.generateMipmap(gl.TEXTURE_2D);
		bs.forEach(b => b.data.texture.update(b.fit.x, b.fit.y, b.w, b.h));
	}

	private consoleTexture() {
		const canvas = document.getElementById('test-canvas') as HTMLCanvasElement;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		const bs = this.blocks;
		bs.forEach(b => {
			let s = b.data.source;
			if(s instanceof Image) {
				ctx.drawImage(s, b.fit.x, b.fit.y);
			} else if(s instanceof ImageData) {
				ctx.putImageData(s, b.fit.x, b.fit.y)
			}
		});
	}

	private makeRGBAImageData(alphaChannel): ImageData {
		const imageData = this.ctx2D.createImageData(alphaChannel.width, alphaChannel.height);
		const len = alphaChannel.data.length;
		const alphaChannelData = alphaChannel.data;
		var data = imageData.data;
		for (var i = 0; i < len; i++) {
			data[4 * i + 0] = alphaChannelData[i];
			data[4 * i + 1] = alphaChannelData[i];
			data[4 * i + 2] = alphaChannelData[i];
			data[4 * i + 3] = 255;
		}
		return imageData;
	}

}

export class ImageTexture {
	u = 0;
	v = 0;
	width = 0;
	height = 0;
	private handlers: Function[] = [];
	constructor() {
		
	}
	update(u: number, v: number, width: number, height: number) {
		const mw = TextureConfig.MAX_WIDTH;
		const mh = TextureConfig.MAX_HEIGHT;
		this.u = u/mw;
		this.v = v/mh;
		this.width = width/mw;
		this.height = height/mh;
		this.handlers.forEach(handler => handler(this));
	}
	bind(updateHandler: Function) {
		this.handlers.push(updateHandler);
	}
	unbind(updateHandler: Function) {
		this.handlers.forEach((v, i) => {
			if(v == updateHandler) {
				this.handlers.splice(i, 1);
			}
		});
	}
}