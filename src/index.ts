import { Engine } from './engine';
import { Generator, Shape } from './display';
import { TextureFactroy, ImageTexture } from './texture'
import { Viewport } from './viewport';
import { Mesh, RectMesh } from './mesh';

(function main() {
	const canvas = document.getElementById('glcanvas');
	
	let engine = new Engine(canvas);
	let tf = new TextureFactroy(engine);
	let vp = new Viewport(engine);
	let isDragging = false;
	let dragLastPoint = [];

	vp.setBackgroundColor(getRandomColor());
	
	canvas.addEventListener('mousewheel', wheelHandler);
	canvas.addEventListener('mousedown', dragStart);
	canvas.addEventListener('mousemove', drag);
	canvas.addEventListener('mouseup', dragEnd);
	window.addEventListener('resize', windowResize);
	windowResize();
	
	let p1 = tf.loadImage('../assets/ps.png');
	let p2 = tf.loadImage('../assets/superman.png');
	let p3 = tf.loadImage('../assets/dvd.png');

	Promise.all([p1,p2,p3]).then(init);


	function init(uvs) {
		// drawRects(uvs);
		drawARect(uvs);
		engine.render();
	}

	function drawRects(uvs) {
		const rectMesh: RectMesh = new RectMesh();
		const g1: Generator = new Generator(engine, rectMesh);
		const g2: Generator = new Generator(engine, rectMesh);
		const g3: Generator = new Generator(engine, rectMesh);

		const count = 30;
		const w = 800/count;
		const gs = [g1,g2,g3];
		for(let i = 0; i < count; i ++) {
			for(let j = 0; j < count; j ++) {
				let idx = Math.round(Math.random() * 2);
				let g = gs[idx];
				let obj = g.instance();
				obj.show()
					.setOffset(i*w-400+w/2, j*w-400+w/2)
					.setBgColor(getRandomColor())
					.setTexture(uvs[idx])
					// .setZOrder(0);
			}
		}
	} 	

	function drawARect(uvs) {
		const rectMesh: RectMesh = new RectMesh();
		const g1: Generator = new Generator(engine, rectMesh);
		const g2: Generator = new Generator(engine, rectMesh);
		const g3: Generator = new Generator(engine, rectMesh);

		const count = 30;
		const w = 800/count;
		const gs = [g1,g2,g3];
		g1.instance()
			.show()
			.setOffset(300, 150)
			.setBgColor(getRandomColor())
			.setTransformValue(100);
	}

	// function drawArrows() {
	// 	const count = 50000;
	// 	const arrowMesh: Mesh = MeshFactroy.createArrowMesh();
	// 	const g: Generator = new Generator(engine, arrowMesh);

	// 	for(let i = 0; i < count; i ++) {
	// 		const s: Shape = g.instance()
	// 			.show()
	// 			.setBgColor(getRandomColor())
	// 			.setBorderColor(getRandomColor())
	// 			.setVertexRatio(Math.random()*50)
	// 			.setOffset(Math.random()*1000 - 500, Math.random()*800 - 400);
	// 	}
	// }

	function wheelHandler(evt) {
		if(evt.preventDefault) {
			evt.preventDefault();
		}
		evt.returnValue = false;
		const mx = evt.pageX;
		const my = evt.pageY;
		let d = - evt.wheelDeltaY / 1000;
		vp.setScaleOrigin(d+vp.scale, mx, my);
	}

	function dragStart(evt) {
		isDragging = true;
		dragLastPoint = [evt.x, evt.y];
	}

	function drag(evt) {
		if(!isDragging) return;
		const dx = evt.x - dragLastPoint[0];
		const dy = evt.y - dragLastPoint[1];

		vp.translate(dx, -dy);

		dragLastPoint = [evt.x, evt.y];
	}

	function dragEnd(evt) {
		isDragging = false;
		dragLastPoint = [];
	}

	function windowResize() {
		vp.setViewportSize(document.body.clientWidth, document.body.clientHeight);
	}

	function getRandomColor() {
		return [Math.random()*255,Math.random()*255,Math.random()*255,255];
	}

})();