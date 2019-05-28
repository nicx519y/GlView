export class TextureFactroy {
	private rowy;
	private currx=0;
	private curry=0;
	private maxWidth = 3000;
	private maxHeight = 3000;
	private engine;
	private textBuffer;
	// 初始化材质
	constructor(engine) {
		this.engine = engine;
		const gl = this.engine.gl;
		//打开透明混色
		// gl.enable(gl.BLEND);
		// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		//创建不可变材质空间
		this.textBuffer = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.textBuffer);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//y轴反转
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.maxWidth, this.maxHeight);
	}
	public createImageTexture(image): ImageTexture {
		const gl = this.engine.gl;
		const prg = this.engine.prg;
		let uv = this.getImageUV(image);
		if(uv) {
			const mw = this.maxWidth;
			const mh = this.maxHeight;
			const x = uv.x;
			const y = uv.y;
			const w = uv.width;
			const h = uv.height;
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_2D);

			return new ImageTexture(x/mw, y/mh, w/mw, h/mh);
		} else {
			console.error('Create ImageTexture fail.');
			return null;
		}
	}

	public loadImage(src: string) {
		return new Promise((resolve, reject) => {
			let image = new Image();
			image.onload = () => {
				let texture: ImageTexture = this.createImageTexture(image);
				if(texture) {
					resolve(texture);
				} else {
					reject(null);
				}
			}
			image.src = src;
		});
	}

	private getImageUV(image) {
		if(image.width > this.maxWidth || image.height + this.curry > this.maxHeight) {
			console.error('Texture image out of range.');
			return;
		}
		if(this.currx + image.width > this.maxWidth) {
			this.curry = this.rowy;
			this.currx = 0;
			return this.getImageUV(image);
		}
		this.rowy = Math.max(this.rowy, this.curry + image.height);
		let x = this.currx,
			y = this.curry,
			w = image.width,
			h = image.height,
			mw = this.maxWidth,
			mh = this.maxHeight;
		this.currx += image.width;
		return {
			x: x, y: y, width: w, height: h,
		};
	}
}

export class ImageTexture {
	u = 0;
	v = 0;
	width = 0;
	height = 0;
	constructor(u = 0, v = 0, width = 0, height = 0) {
		this.u = u;
		this.v = v;
		this.width = width;
		this.height = height;
	}
}
