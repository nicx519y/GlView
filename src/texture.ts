import { GrowingPacker, PNode } from './packer';

const TextureConfig = {
	MAX_WIDTH : Math.pow(2, 12),
	MAX_HEIGHT : Math.pow(2, 12),
}


export class TextureFactroy {
	private packer: GrowingPacker;
	private rowy;
	private currx=0;
	private curry=0;
	private engine;
	private blocks: PNode[] = [];
	// 初始化材质
	constructor(engine) {
		this.engine = engine;
		const gl = this.engine.gl;
		const mw = TextureConfig.MAX_WIDTH;
		const mh = TextureConfig.MAX_HEIGHT;
		this.packer = new GrowingPacker(mw, mh);
		//创建不可变材质空间
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//y轴反转
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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

	public updateToGL() {
		const gl = this.engine.gl;
		this.blocks = this.blocks.sort((a, b) => { 
			if (a.w + a.h > b.w + b.h) return -1;
			return 1;
		});
		this.packer.fit(this.blocks);
		this.blocks.forEach(b => gl.texSubImage2D(gl.TEXTURE_2D, 0, b.fit.x, b.fit.y, b.w, b.h, gl.RGBA, gl.UNSIGNED_BYTE, b.data.source));
		gl.generateMipmap(gl.TEXTURE_2D);
		this.blocks.forEach(block => block.data.texture.update(block.fit.x, block.fit.y, block.w, block.h));
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
