import { Engine } from './engine';
import { Generator, Shape } from './display';
import { TextureFactroy, ImageTexture } from './texture'
import { Viewport } from './viewport';
import { Mesh, MeshFactroy } from './mesh';

(function main() {
	const canvas = document.getElementById('glcanvas');
	
	let engine = new Engine(canvas);
	let tf = new TextureFactroy(engine);
	let vp = new Viewport(engine);

	vp.setBackgroundColor(getRandomColor());
	
	canvas.addEventListener('mousewheel', wheelHandler);
	window.addEventListener('resize', windowResize);
	windowResize();
	
	let p1 = tf.loadImage('../assets/ps.png');
	let p2 = tf.loadImage('../assets/superman.png');
	let p3 = tf.loadImage('../assets/dvd.png');

	Promise.all([p1,p2,p3]).then(init);


	function init(uvs) {
		// const rectMesh: Mesh = MeshFactroy.createRectMesh();
		// const g1: Generator = new Generator(engine, rectMesh);
		// const g2: Generator = new Generator(engine, rectMesh);
		// const g3: Generator = new Generator(engine, rectMesh);

		// const count = 30;
		// const w = 800/count;
		// const gs = [g1,g2,g3];
		// for(let i = 0; i < count; i ++) {
		// 	for(let j = 0; j < count; j ++) {
		// 		let idx = Math.round(Math.random() * 2);
		// 		let g = gs[idx];
		// 		let obj = g.instance();
		// 		obj.show();
		// 		obj.setOffset(i*w-400+w/2, j*w-400+w/2);
		// 		obj.setBgColor(getRandomColor());
		// 		obj.setTexture(uvs[idx]);
		// 		obj.setBorderColor(getRandomColor());
		// 		obj.setBorderWidth(1);
		// 		obj.setVertexRatio(w);
		// 		obj.setZOrder(0);
		// 	}
		// }
		drawArrows();
		
			// .setBorderWidth(1);

		engine.render();
	}

	function drawArrows() {
		const count = 50000;
		const arrowMesh: Mesh = MeshFactroy.createArrowMesh();
		const g: Generator = new Generator(engine, arrowMesh);

		for(let i = 0; i < count; i ++) {
			const s: Shape = g.instance()
				.show()
				.setBgColor(getRandomColor())
				.setBorderColor(getRandomColor())
				.setVertexRatio(Math.random()*50)
				.setOffset(Math.random()*1000 - 500, Math.random()*800 - 400);
		}
	}

	function wheelHandler(evt) {
		if(evt.preventDefault) {
			evt.preventDefault();
		} 
		evt.returnValue = false;
		let s = vp.getScaleX() - evt.wheelDeltaY / 1000;
		if (s < 0.2) {
			s = 0.2;
		}
		if(s > 1) {
			s = 1;
		}
		vp.setScale(s, s);
	}

	function windowResize() {
		vp.setViewportSize(document.body.clientWidth, document.body.clientHeight);
	}

	function getRandomColor() {
		return [Math.random()*255,Math.random()*255,Math.random()*255,255];
	}

})();