import { Shape } from "./display";

/**
 * 判断点是否在多边形内
 * @param p 点坐标
 * @param poly 多边形顶点坐标
 */
function rayCasting(p: number[], poly: number[]): boolean {
	var px = p[0],
	py = p[1],
	flag = false,
	l = poly.length / 2;

	for(var i = 0, j = l - 1; i < l; j = i, i++) {
		var sx = poly[i*2],
		sy = poly[i*2+1],
		tx = poly[j*2],
		ty = poly[j*2+1];

		// 点与多边形顶点重合
		if((sx === px && sy === py) || (tx === px && ty === py)) {
			flag = true;
			break;
		}

		// 判断线段两端点是否在射线两侧
		if((sy < py && ty >= py) || (sy >= py && ty < py)) {
			// 线段上与射线 Y 坐标相同的点的 X 坐标
			var x = sx + (py - sy) * (tx - sx) / (ty - sy)

			// 点在多边形的边上
			if(x === px) {
				flag = true;
				break;
			}

			// 射线穿过多边形的边界
			if(x > px) {
				flag = !flag
			}
		}
	}

	// 射线穿过多边形边界的次数为奇数时点在多边形内
	return flag;
}

// export class Searcher {
// 	private _sobj;
// 	constructor(engine) {
// 		this._sobj = engine.searcher;
// 	}

// 	public search(x: number, y: number, width: number = 0, height: number = 0): Shape[] {
// 		let result = this._sobj.search({ x: x, y: y, w: width, h: height, }, true);
// 		// 区域长宽为0，返回点交元素
// 		if(width == 0 && height == 0) {
// 			result = result.filter(v => {
// 				const shape = v.leaf as Shape;
// 				const vectexes = shape.getVertexesAfterTransform();
// 				return rayCasting([x, y], vectexes);
// 			});
// 		} else {	//区域长宽不为0，返回矩形区域完全包围的元素
// 			result = result.filter(v => v.x <= x && v.y <= y && v.x + v.w <= x + width && v.y + v.h <= y + height);
// 		}

// 		return result.map(v => {
// 			return v.leaf as Shape;
// 		});
// 	}
// }
