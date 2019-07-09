import * as glMatrix from '../lib/gl-matrix';

import { 
	Engine,
	Generator,
	Viewport, 
	RectMesh, 
	OneWayArrowMesh, 
	TwoWayArrowMesh,
	SearchObjectInterface,
	TextureFactroy, 
	RenderObject, 
	loadImages, 
	ImageTexture, 
	TextFieldGenerator,
	TextField,
	ArrowGenerator,
	Arrow, ArrowType, GeneratorInterface, ComponentInterface,
	hexToRgb,
} from '../src';
import { brotliDecompress } from 'zlib';


const vec2 = glMatrix.vec2;
const vec3 = glMatrix.vec3;

class ObjList {
	_list = [];
	_g: GeneratorInterface;
	constructor(g: GeneratorInterface) {
		this._g = g;
	}

	find(id: string): ComponentInterface {
		let a = this._list.find(v => v.id == id);
		return a;
	}

	add(): ComponentInterface {
		const obj = this._g.instance().show();
		this._list.push(obj);
		return obj;
	}

	remove(obj: ComponentInterface) {
		const idx = this._list.indexOf(obj);
		if(idx < 0) return;
		obj.hide();
		this._list.splice(idx, 1);
	}

	get list(): ComponentInterface[] {
		return this._list;
	}
}

class ObjPane {
	con;
	addBtn;
	clearBtn;
	conBox;
	temp;
	txt: ImageTexture;
	g;
	objlist: ObjList;
	constructor(container, generator: GeneratorInterface, temp: string, texture: ImageTexture) {
		this.con = container;
		this.addBtn = container.find('.add-btn');
		this.clearBtn = container.find('.clear-btn');
		this.conBox = container.find('.con-box');
		this.objlist = new ObjList(generator);
		this.temp = temp;
		this.txt = texture;
		this.g = generator;
		this.addBtn.click(evt => this.add());
		this.clearBtn.click(evt => this.clear());
	}

	add() {
		const obj = this.objlist.add() as RenderObject;
		const content = $('<div class="content" >');
		content.html(this.temp);
		content.attr('name', obj.id);
		this.conBox.append(content);
		content.find('input').each((index, input) => $(input).change(evt => this.onChange(evt)));
		content.find('button.status-btn').click(evt => this.toggle(evt));
		content.find('button.delete-btn').click(evt => this.remove(evt));
		content.find('input').each((index, input) => $(input).change());
		obj.searchable = true;
		obj.texture = this.txt;
	}

	toggle(evt) {
		const p = $(evt.target).parent();
		const id = p.attr('name');
		const obj = this.objlist.find(id) as any;
		if(obj.isShown) {
			obj.hide();
			$(evt.target).html('显示');
		} else {
			obj.show();
			$(evt.target).html('隐藏');
		}
	}

	remove(evt) {
		const p = $(evt.target).parent();
		const id = p.attr('name');
		const obj = this.objlist.find(id) as any;
		this.objlist.remove(obj);

		p.remove();
	}

	clear() {
		this.g.clear();
	}

	onChange(evt) {
		const p = $(evt.target).parent();
		const id = p.attr('name');
		const attr = $(evt.target).attr('name');
		const obj = this.objlist.find(id) as any;
		let value = $(evt.target).val();
		switch(attr) {
			case 'x':
			case 'y':
				const x = p.find('[name=x]').val();
				const y = p.find('[name=y]').val();
				obj.translation = [parseInt(x), parseInt(y)];
				break;
			case 'width':
			case 'height':
				const w = p.find('[name=width]').val();
				const h = p.find('[name=height]').val();
				obj.size = [parseInt(w), parseInt(h)];
				break;
			case 'backgroundColor':
				value = hexToRgb(value);
				value.push(255);
				obj.backgroundColor = value;
				break;
			case 'rotation':
				value = value / 180 * Math.PI;
				obj.rotation = value;
				break;
			case 'borderWidth':
				obj.borderWidth = parseInt(value);
				break;
			case 'borderColor':
				value = hexToRgb(value);
				value.push(255);
				obj.borderColor = value;
				break;
			case 'borderDashed':
				obj.borderDashed = value;
				break;
			case 'scale':
				obj.scale = value * 1;
				break;
		}
	}
}

function main() {
	const canvas = document.getElementById('glcanvas');
	let engine = new Engine(canvas);
	let scr = engine.searcher;
	let tf = new TextureFactroy(engine);
	let vp = new Viewport(engine);
	let isDragging = false;
	let dragLastPoint = [];
	let activeShape: RenderObject;
	let uvlist = [];
	let objlist = [];
	vp.setBackgroundColor([186, 186, 186, 255]);
	
	canvas.addEventListener('mousewheel', wheelHandler);
	canvas.addEventListener('mousedown', dragStart);
	canvas.addEventListener('mousemove', drag);
	canvas.addEventListener('click', clickHandler);
	canvas.addEventListener('mouseup', dragEnd);
	// canvas.addEventListener('mousemove', hoverHandler);
	// canvas.addEventListener('mousemove', showCoord);
	window.addEventListener('resize', windowResize);

	document.getElementById('vp-reset').addEventListener('click', resetViewport);

	windowResize();

	// tf.embedFont('打游戏1234567890*_+()');
	
	const fontTextureMap = tf.getFontTextures();
	loadImages(['../assets/1.jpg', '../assets/2.jpg', '../assets/3.jpg', '../assets/4.jpg']).then(init);

	tf.updateToGL();

	var obj;


	function init(images) {

		const textures = images.map(image => tf.createTexture(image, image.width, image.height));
		tf.updateToGL();
		engine.render();
		rectTest(textures[0]);
		drawText();
		// const w = 2000;

		// const count = 3;	// 一共9大块
		// const countEach = 100;	// 每块100*100个
		// for(let i = 0; i < count; i ++) {
		// 	for(let j = 0; j < count; j ++) {
		// 		drawRects(countEach, textures[i], i * w, j * w, w);
		// 	}
		// }
		// drawOneWayArrow();
		// drawTwoWayArrow();


	}
	function rectTest(txt: ImageTexture) {
		const g = new Generator(engine, new RectMesh());
		const pane = new ObjPane($('#rect-box'), g, 
		`
			宽度：<input type="text" name="width" value="100" />
			高度：<input type="text" name="height" value="100" />
			x：<input type="text" name="x" value="300" />
			y：<input type="text" name="y" value="300" />
			旋转：<input type="text" name="rotation" value="0" />
			缩放：<input type="text" name="scale" value="1" />
			背景色：<input type="color" name="backgroundColor" value="#ffffff"  />
			边框：<input type="text" name="borderWidth" value="1" />
			虚线：<input type="text" name="borderDashed" value="5" />
			边框颜色：<input type="color" name="borderColor" value="#000000" />
			<button class="status-btn" >隐藏</button>
			<button class="delete-btn" >删除</button>
		`,txt);
	}


	function testArrow() {
		const g = new ArrowGenerator(engine, 26, 30, 10);
		let active: Arrow;
		let status = 0;

		function add(x, y) {
			if(status != 0) return;
			const type = getType();
			active = g.instance().show();
			active.type = type;
			active.backgroundColor = getRandomColor();
			active.borderWidth = 0;
			active.borderColor = getRandomColor();
			active.fromTo = [x, y, x, y];
			status = 1;
		}

		function end(x, y) {
			if(status != 1) return;
			const ft = active.fromTo;
			active.fromTo = [ft[0], ft[1], x, y];
			status = 0;
		}

		function move(x, y) {
			if(status != 1) return;
			const ft = active.fromTo;
			active.fromTo = [ft[0], ft[1], x, y];
		}

		function clickHandler(evt) {
			const pos = vp.changeCoordinateFromScreen(evt.offsetX, evt.offsetY);
			if(status == 0) {
				add(pos[0], pos[1]);
			} else if(status == 1) {
				end(pos[0], pos[1]);
			}
		}

		function moveHandler(evt) {
			const pos = vp.changeCoordinateFromScreen(evt.offsetX, evt.offsetY);
			if(status == 1) {
				move(pos[0], pos[1]);
			}
		}

		function getType(): ArrowType {
			const r1 = document.getElementById('one') as HTMLInputElement;
			const r2 = document.getElementById('two') as HTMLInputElement;
			if(r1.checked) {
				return ArrowType.ONE_WAY;
			} else {
				return ArrowType.TWO_WAY;
			}
			return ArrowType.ONE_WAY;
		}

		canvas.addEventListener('click', clickHandler);
		canvas.addEventListener('mousemove', moveHandler);
	}

	function testAddAndRemove() {
		const g = new Generator(engine, new RectMesh());
		document.getElementById('add').addEventListener('click', evt => {
			let obj = testAdd(g);
			objlist.push(obj);
		});
		document.getElementById('remove').addEventListener('click', evt => {
			testRemove(objlist);
		});
	}

	function drawText() {
		
		const g: TextFieldGenerator = new TextFieldGenerator(engine, tf);
		const t: TextField = g.instance();
		t.show();
		t.text = '哈哈哈';
		t.fontSize = 40;
		t.color = [255,0,0,255];
		t.translation = [200, 400];
		t.wordSpace = 8;
		t.borderWidth = 2;
		t.borderColor = [255,255,0,255];

		const tt: TextField = g.instance();
		tt.show();
		tt.text = "982";
		tt.fontSize = 20;
		tt.color = [0,0,0,255];
		tt.translation = [0, 500];
		tt.wordSpace = 0;
		// tt.borderWidth = 0;
		// tt.borderColor = [0,0,0,255];

		tt.text = '星际争霸';
	}

	function drawRects(countEach: number, texture: ImageTexture, offsetX: number, offsetY: number, areaWidth: number) {
		const rectMesh: RectMesh = new RectMesh();
		const g1: Generator = new Generator(engine, rectMesh);
		const count = countEach;
		const w =areaWidth/count;
		for(let i = 0; i < count; i ++) {
			for(let j = 0; j < count; j ++) {
				let c = getRandomColor();
				c[3] = 200;
				let obj = g1.instance();
				obj.searchable = false;
				obj.show();
				obj.translation = [i*w+w/2 + offsetX, j*w+w/2 + offsetY];
				obj.backgroundColor = c;
				obj.texture = texture;
				obj.size = [w,w];
				obj.rotation = Math.PI/6;
				if(i % 3 == 0) {
					obj.borderWidth = 1;
					obj.borderDashed = 2;
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
		obj.searchable = true;
		obj.expandRadius = 20;
	}

	function drawTwoWayArrow() {

		const g = new ArrowGenerator(engine, 100, 100, 10);
		const obj = g.instance() as Arrow;
		obj.fromTo = [100, 100, 300, 300];
		obj.type = 2;
		obj.show();
		obj.backgroundColor = getRandomColor();
		obj.borderWidth = 3;
		obj.borderDashed = 10;
		obj.borderColor = [0,0,0,255];
		obj.searchable = true;
		obj.expandRadius = 20;
		
	}

	function wheelHandler(evt) {
		if(evt.preventDefault) {
			evt.preventDefault();
		}
		evt.returnValue = false;
		const mx = evt.pageX;
		const my = evt.pageY;
		const isMAC = OSnow();
		let d;
		if(isMAC) {
			d = - evt.wheelDeltaY / 1000;
		} else {
			d = evt.wheelDeltaY / 3000;
		}
		const v = vp.changeCoordinateFromScreen(mx, my);
		vp.scaleOrigin(d+vp.scale, v[0], v[1]);
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
		// let cs = vp.changeCoordinateFromScreen(evt.pageX, evt.pageY);
		// const objArr: SearchObject[] = scr.search(cs[0], cs[1]);
		// objArr.forEach(obj => console.log('obj ' + obj.id + ' is hovered'))
	}

	function clickHandler(evt) {
		let cs = vp.changeCoordinateFromScreen(evt.pageX, evt.pageY);
		const objArr: SearchObjectInterface[] = scr.search(cs[0], cs[1]);
		// console.log(objArr);
		if(!objArr || objArr.length <= 0) return;
	}

	function testAdd(g: Generator): RenderObject {
		const obj = g.instance().show();
		obj.translation = [Math.random() * 800, Math.random() * 800];
		obj.vertexOffsetValue = [Math.random() * 100 + 50, Math.random() * 100 + 50];
		obj.backgroundColor = getRandomColor();
		obj.borderColor = getRandomColor();
		obj.borderWidth = 2;
		obj.rotation = Math.random() * Math.PI;
		return obj;
	}

	function testRemove(objlist: RenderObject[]) {
		const obj = objlist.pop();
		obj && obj.hide();
	}

	function showCoord(evt) {
		let cs = vp.changeCoordinateFromScreen(evt.pageX, evt.pageY);
		if(!cs || cs.length <= 0 || typeof cs[0] != 'number') return;
		document.getElementById('coor').innerHTML = 'x: ' + Math.round(cs[0]) + 'px; ' + 'y: ' + Math.round(cs[1]) + 'px';
	}
	
	function resetViewport() {
		const translateX = parseInt((document.getElementById('vp-translate-x') as HTMLInputElement).value);
		const translateY = parseInt((document.getElementById('vp-translate-y') as HTMLInputElement).value);
		const scale = parseInt((document.getElementById('vp-scale') as HTMLInputElement).value) / 100;
		const originX = parseInt((document.getElementById('vp-scale-x') as HTMLInputElement).value);
		const originY = parseInt((document.getElementById('vp-scale-y') as HTMLInputElement).value);
		vp.resetTranslationAndScale(translateX, translateY, scale, originX, originY);
	}

	function OSnow(): boolean {
		var agent = navigator.userAgent.toLowerCase();
		var isMac = /macintosh|mac os x/i.test(navigator.userAgent);
		return isMac;
	}

};

window.onload = () => main();
