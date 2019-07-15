import { ImageTexture, TextureFactroy } from "./texture";
import { RenderObject, OutViewportStatus, DisplayStatus } from "./render-object";
import { Generator } from './generator';
import { IdCreator, arrayEqual, isChinese, numberClamp } from "./utils";
import { ComponentInterface } from "./interfaces";
import { SearchableObject } from "./searchable-object";
import { Engine } from './engine';

export class TextField extends SearchableObject implements ComponentInterface {
	private _id: string;
	private _isShown: boolean = false;
	private _text: string = '';
	private _fontSize: number = 12;
	private _translation: number[] = [0, 0];
	private _color: number[] = [255,255,255,255];
	private _borderWidth: number = 0;
	private _borderColor: number[] = [0,0,0,0];
	private _opacity: number = 1;
	private _display: DisplayStatus = DisplayStatus.DISPLAY;
	private _outViewportStatus: OutViewportStatus = OutViewportStatus.NONE;
	private _attachViewportScale: boolean = true;
	private _attachViewportTranslation: boolean = true;
	
	private _tf: TextureFactroy;
	private _fontObjects: RenderObject[];
	private _gs: Generator[];

	constructor(engine: Engine, generators: Generator[]) {
		super(engine.searcher);
		this._id = IdCreator.createId();
		this._gs = generators;
		this._tf = engine.textureFactroy;
		this._fontObjects = [];
		this._gs.forEach(g => {
			let obj = g.instance();
			obj.isText = true;
			this._fontObjects.push(obj);
		});
	}
	
	get id(): string {
		return this._id;
	}

	get isShown(): boolean {
		return this._isShown;
	}

	show(): TextField {
		if(this._isShown) return this;
		this._isShown = true;
		this._fontObjects.forEach(v => v.show());
		this.resetFonts();
		this.searchable && this.registToSearcher();
		return this;
	}

	hide(): TextField {
		if(!this._isShown) return this;
		this._isShown = false;
		// this.resetFonts();
		this._fontObjects.forEach(v => v.hide());
		this.deregistToSearcher();
		return this;
	}

	set text(str: string) {
		this._text = str;
		this.resetFonts();
		this.setFontsTranslation();
	}

	get text(): string {
		return this._text;
	}

	set translation(offset: number[]) {
		this._translation = offset;
		this.setFontsTranslation();
		this.searchable && this.registToSearcher();
	}

	get translation(): number[] {
		return this._translation;
	}

	set fontSize(size: number) {
		this._fontSize = size;
		this.setFontsTranslation();
		this.searchable && this.registToSearcher();
	}

	get fontSize(): number {
		return this._fontSize;
	}

	set color(color: number[]) {
		this._color = color;
		this.resetFonts();	
	}

	get color(): number[] {
		return this._color;
	}

	set borderWidth(n: number) {
		if(this._borderWidth == n) return;
		this._borderWidth = n;
		this.resetFonts();
	}

	get borderWidth(): number {
		return this._borderWidth;
	}

	set borderColor(color: number[]) {
		if(arrayEqual(this._borderColor, color)) return;
		this._borderColor = color;
		this.resetFonts();
	}

	set opacity(n: number) {
		this._opacity = numberClamp(0, 1, n);
		this.resetFonts();
	}

	get opacity() {
		return this._opacity;
	}

	set display(n: DisplayStatus) {
		this._display = n;
		this.resetFonts();
	}

	get display(): DisplayStatus {
		return this._display;
	}

	set outViewportStatus(status: OutViewportStatus) {
		this._outViewportStatus = status;
		this.resetFonts();
	}

	get outViewportStatus(): OutViewportStatus {
		return this._outViewportStatus;
	}

	set attachViewportScale(n: boolean) {
		this._attachViewportScale = n;
		this.resetFonts();
	}

	get attachViewportScale(): boolean {
		return this._attachViewportScale;
	}

	set attachViewportTranslation(n: boolean) {
		this._attachViewportTranslation = n;
		this.resetFonts();
	}

	get attachViewportTranslation(): boolean {
		return this._attachViewportTranslation;
	}

	private resetFonts() {
		const len = this._text.length;
		const f = this._tf;
		const gs = this._gs;

		this._fontObjects.forEach((v,k) => {
			if(k < len) {
				let text = this._text[k];
				v.backgroundColor = this._color;
				v.opacity = this._opacity;
				v.textBorderWidth = this._borderWidth;
				v.textBorderColor = this._borderColor;
				v.outViewportStatus = this._outViewportStatus;
				v.attachViewportScale = this._attachViewportScale;
				v.attachViewportTranslation = this._attachViewportTranslation;
				v.display = this._display;
				let texture = f.getFontTexture(text);
				// console.log(texture, text)
				if(!texture || !(texture instanceof ImageTexture)) {
					console.error('Can not found ImageTexture of text: "'+text+'".');
					return;
				} else {
					v.texture = texture;
				}
			} else {
				v.display = DisplayStatus.NONE;
			}
		});
	}

	private setFontsTranslation() {
		const offset = this._translation;
		const s = this._fontSize;
		const half = 0.5*s;
		this._fontObjects.forEach(v => {
			v.size = [s, s];
			v.translation = offset;
		});
	}

	public getVertexPositions(expand: number = 0): number[] {
		const len = this._fontObjects.length;
		if(len <= 0) return [];
		const first = this._fontObjects[0].getVertexPositions(expand);
		const last = this._fontObjects[len - 1].getVertexPositions(expand);
		const vs = first.concat(last);
		const vx = vs.filter((v, k) => k % 2 == 0);
		const vy = vs.filter((v, k) => k % 2 != 0);
		const minX = Math.min.apply(null, vx);
		const maxX = Math.max.apply(null, vx);
		const minY = Math.min.apply(null, vy);
		const maxY = Math.max.apply(null, vy);
		return [minX, maxY, minX, minY, maxX, minY, maxX, maxY];
	}
}