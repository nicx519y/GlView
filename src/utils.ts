export class Rectangle {
	x: number;
	y: number;
	w: number;
	h: number;
	constructor(x: number, y: number, w: number, h: number) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
}

export interface PaintUnitInterface {
	draw(): void;
}

export function getBounds(vertexes: number[]): Rectangle {
	const vs = vertexes;
	const vsx = vs.filter((v, k) => k % 2 == 0);
	const vsy = vs.filter((v, k) => k % 2 != 0);
	const minx = Math.min.apply(null, vsx);
	const maxx = Math.max.apply(null, vsx);
	const miny = Math.min.apply(null, vsy);
	const maxy = Math.max.apply(null, vsy);
	return new Rectangle(minx, miny, maxx - minx, maxy - miny);
}

export function loadImage(src: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.src = src;
	});
}

export function loadImages(srcs: string[]): Promise<any[]> {
	return Promise.all(srcs.map(src => loadImage(src)));
}

export class IdCreator {
	private static num: number = 0;
	public static createId(): string {
		this.num ++;
		return this.num.toString();
	}
}