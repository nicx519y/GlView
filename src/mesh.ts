export enum PrimitiveMode {
	TRIANGLE_STRIP = 'TriangleStrip',
	TRIANGLE_FAN = 'TriangleFan',
}

export class Mesh {
	private _vertexes: number[];
	private _transforms: number[];
	private _uv: number[];
	private _indeces: number[];
	private _primitiveMode: PrimitiveMode;
	/**
	 * 模型构造函数
	 * @param vertexes 顶点坐标
	 * @param borderVertexes 边框顶点坐标
	 * @param uv 材质UV
	 */
	constructor(mode: PrimitiveMode, vertexes: number[], tranforms: number[], uv: number[], indeces: number[]) {
		this._vertexes = vertexes;
		this._transforms = tranforms;
		this._uv = uv;
		this._indeces = indeces;
		this._primitiveMode = mode;
	}

	get vertexes(): number[] {
		return this._vertexes;
	}

	get transfroms(): number[] {
		return this._transforms;
	}

	get uv(): number[] {
		return this._uv;
	}

	get indeces(): number[] {
		return this._indeces;
	}

	get primitiveMode(): PrimitiveMode {
		return this._primitiveMode;
	}

}

export class RectMesh extends Mesh {
	constructor() {
		const vertexes = [
			0,0,
			0,0,
			0,0,
			0,0,
		];
		const tranforms = [
			-0.5, 0.5,
			-0.5, -0.5,
			0.5, -0.5,
			0.5, 0.5,
		];
		const uv = [
			0, 1,
			0, 0,
			1, 0,
			1, 1,
		];
		const indeces = [
			0, 1, 3, 2,
		];
		super(PrimitiveMode.TRIANGLE_STRIP, vertexes, tranforms, uv, indeces);
	}
}

// export class MeshUnit {
// 	vertexes: number[];
// 	primitiveMode: PrimitiveMode;
// 	constructor(v: number[], mode: PrimitiveMode) {
// 		this.vertexes = v;
// 		this.primitiveMode = mode;
// 	}
// }

// export class MeshFactroy {
// 	public static createRectMesh() {
// 		const varr = [
// 			// x, y, dynamicX, dynamicY,
// 			0,	0,	-0.5,	 0.5,
// 			0,	0,	-0.5,	-0.5,
// 			0,	0,	 0.5,	 0.5,
// 			0,	0,	 0.5,	-0.5,
// 		];

// 		const uv = [
// 			0,	1,
// 			0,	0,
// 			1,	1,
// 			1,	0,
// 		];
		
// 		const bArr = [
// 			// x, y, dynamicX, dynamicY,
// 			0, 	0,	-0.5,	 0.5,
// 			0,	0,	 0.5,	 0.5,
// 			0,	0,	 0.5,	-0.5,
// 			0,	0,	-0.5,	-0.5,
// 		];
// 		return new Mesh(PrimitiveMode.TRIANGLE_STRIP ,varr, bArr, uv);
// 	}

// 	public static createArrowMesh() {
// 		const varr = [
// 			 0,	15, 0, 0,
// 			-8, 0, 0, 0,
// 			-3, 0, 0, 0,
// 			-3, 0, 0, -1,
// 			 3, 0, 0, -1,
// 			 3, 0, 0, 0,
// 			 8, 0, 0, 0,
// 		];

// 		const uv = [
// 			0, 0,
// 			0, 0,
// 			0, 0,
// 			0, 0,
// 			0, 0,
// 			0, 0,
// 			0, 0,
// 		];

// 		const bArr = varr;

// 		return new Mesh(PrimitiveMode.TRIANGLE_FAN, varr, bArr, uv);
// 	}

// 	public static createTestMesh() {
// 		const varr = [

// 		];
// 	}
// }

// private createBorderVertex(verteies: number[]) {
// 	let len = verteies.length;
// 	if(len % 4 != 0 && len < 4*3) return;
// 	let vlist = [];

// 	for (let i = 0; i < len; i += 4) {

// 		let curr = i,
// 			prev = 0,
// 			next = 0;

// 		if(i == 0) {
// 			prev = len - 4;	
// 			next = i + 4;
// 		} else if (i == len - 4) {
// 			prev = i - 4;
// 			next = 0;
// 		} else {
// 			prev = i - 4;
// 			next = i + 4;
// 		}

// 		let currP = new Vector(verteies[curr], verteies[curr+1]),
// 			prevP = new Vector(verteies[prev], verteies[prev+1]),
// 			nextP = new Vector(verteies[next], verteies[next+1]);

// 		let v = this.getVertexVec(prevP, currP, nextP);
// 		vlist.push(verteies[i], verteies[i+1], verteies[i+2], verteies[i+3], v.x, v.y);
// 		vlist.push(0,0);
// 		vlist.push(verteies[i], verteies[i+1], verteies[i+2], verteies[i+3], 0, 0);
// 		vlist.push(0,0);
// 	}
// 	//闭合
// 	vlist.push.apply(vlist, vlist.slice(0, 16));

// 	return vlist;
// }
	
// // 	获取顶点的偏倚矢量
// private getVertexVec(prevP, currP, nextP) {
// 	let v1 = this.getBorderVercitalVec(prevP, currP),
// 		v2 = this.getBorderVercitalVec(currP, nextP);

// 	let p1 = prevP.add(v1),
// 		p2 = currP.add(v1),
// 		p3 = currP.add(v2),
// 		p4 = nextP.add(v2);

// 	let A1 = p2.y - p1.y,
// 		B1 = p2.x - p1.x,
// 		C1 = p2.x * p1.y - p2.y * p1.x,
// 		A2 = p4.y - p3.y,
// 		B2 = p4.x - p3.x,
// 		C2 = p4.x * p3.y - p4.y * p3.x;

// 	let D = A1 * B2 - A2 * B1;

// 	let v = new Vector((B1 * C2 - B2 * C1)/D, -(C1 * A2 - C2 * A1)/D);
// 	return v.subtract(currP);
// }

// // 获取边得垂直向量
// private getBorderVercitalVec(p1, p2) {
// 	let v = p2.subtract(p1);
// 	let a = v.angleTo(new Vector(1,0));

// 	// angleTo 对角度的正负不敏感
// 	if(v.y < 0) {
// 		a = - a;
// 	}

// 	// 求边的垂直向量
// 	a -= Math.PI/2;

// 	let x = Math.cos(a),
// 		y = Math.sin(a);

// 	if(Math.abs(x) <= 10e-5) {
// 		x = 0;
// 	}
// 	if(Math.abs(y) <= 10e-5) {
// 		y = 0;
// 	}
// 	return new Vector(x, y);
// }