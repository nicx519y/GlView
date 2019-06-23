import * as glMatrix from '../lib/gl-matrix'

import { 
	Engine,
	Generator,
	Viewport, 
	RectMesh, 
	OneWayArrowMesh, 
	TwoWayArrowMesh,
	SearchObject,
	TextureFactroy, 
	RenderObject, 
	loadImages, 
	ImageTexture 
} from '../src';


const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;

(function main() {
	const canvas = document.getElementById('glcanvas');
	let engine = new Engine(canvas);
	let scr = engine.searcher;
	let tf = new TextureFactroy(engine);
	let vp = new Viewport(engine);
	let isDragging = false;
	let dragLastPoint = [];
	let activeShape: RenderObject;
	let uvlist = [];
	vp.setBackgroundColor(getRandomColor());
	
	canvas.addEventListener('mousewheel', wheelHandler);
	canvas.addEventListener('mousedown', dragStart);
	canvas.addEventListener('mousemove', drag);
	canvas.addEventListener('mouseup', dragEnd);
	canvas.addEventListener('mousemove', hoverHandler);
	window.addEventListener('resize', windowResize);

	windowResize();

	loadImages(['../assets/ps.png', '../assets/superman.png', '../assets/dvd.png']).then(init);

	var obj;


	function init(images) {

		const textures = images.map(image => tf.createTexture(image, image.width, image.height));
		tf.updateToGL();
		drawRects(textures[2]);
		// drawOneWayArrow();
		// drawTwoWayArrow();
		engine.render();
	}

	function drawRects(texture: ImageTexture) {
		const rectMesh: RectMesh = new RectMesh();
		const g: Generator = new Generator(engine, rectMesh);
		const count = 10;
		const w = 800/count;
		for(let i = 0; i < count; i ++) {
			for(let j = 0; j < count; j ++) {
				let c = getRandomColor();
				c[3] = 200;
				let idx = Math.round(Math.random() * 2);
				let obj = g.instance().show();
				obj.translation = [i*w+w/2, j*w+w/2];
				obj.backgroundColor = c;
				obj.texture = texture;
				obj.vertexOffsetValue = [w,w];
				obj.rotation = Math.PI/6;
				if(i % 3 == 0) {
					obj.borderWidth = 3;
					obj.borderColor = getRandomColor();
				}
			}
		}
	} 	

	function drawARect(uvs) {
		const rectMesh: RectMesh = new RectMesh();
		const g1: Generator = new Generator(engine, rectMesh);
		const g2: Generator = new Generator(engine, rectMesh);
		const g3: Generator = new Generator(engine, rectMesh);

		const count = 2;
		const w = 800/count;
		const gs = [g1,g2,g3];
		obj = g1.instance()
			.show()
	}

	function drawOneWayArrow() {
		const arrowMesh: OneWayArrowMesh = new OneWayArrowMesh(100, 100);
		const g: Generator = new Generator(engine, arrowMesh);
		const obj = g.instance().show();
		obj.translation = [100, 100];
		obj.vertexOffsetValue = [0,100];
		obj.rotation = Math.PI / 4;
		obj.backgroundColor = getRandomColor();
	}

	function drawTwoWayArrow() {
		const arrowMesh: TwoWayArrowMesh = new TwoWayArrowMesh(100, 100);
		const g: Generator = new Generator(engine, arrowMesh);
		const obj = g.instance().show();
		obj.translation = [100, 100];
		obj.vertexOffsetValue = [0, 100];
		obj.rotation = Math.PI / 4;
		obj.backgroundColor = getRandomColor();
	}

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

	function hoverHandler(evt) {
		//调用viewport的方法转换坐标系
		let cs = vp.changeCoordinateFromScreen(evt.pageX, evt.pageY);
		const objArr: SearchObject[] = scr.search(cs[0], cs[1]);
		objArr.forEach(obj => console.log('obj ' + obj.id + ' is hovered'))
	}

})();