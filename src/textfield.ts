import { ImageTexture, FontTexture } from "./texture";
import { RenderObject } from "./render-object";
import { Generator } from './generator';

export class TextField {
	private _textureMap: Map<string, ImageTexture>;
	private _text: string = '';
	private _baseObject: RenderObject;
	private _fontObjects: RenderObject[];
	private _isShown: boolean = false;
	private _size: number;
	private _g: Generator;

	constructor(generator: Generator, texture: FontTexture) {
		this._g = generator;
		this._textureMap = texture.map;
		this._size = texture.size;
		this._baseObject = this._g.instance();
		this._fontObjects = [];
		this.setBaseSize();
		this.setFontObjsTranslation();
	}

	show(): TextField {
		this._baseObject.show();
		this._isShown = true;
		this._fontObjects.forEach(obj => obj.show());
		return this;
	}

	hide(): TextField {
		this._baseObject.hide();
		this._isShown = false;
		this._fontObjects.forEach(obj => obj.hide());
		return this;
	}

	set text(str: string) {
		this._text = str;
		this.setBaseSize();
		this.createFontObjs();
		this.setFontObjsTranslation();
		this._isShown && this._fontObjects.forEach(obj => obj.show());
	}

	set translation(offset: number[]) {
		this._baseObject.translation = offset;
		this.setFontObjsTranslation();
	}

	get translation(): number[] {
		return this._baseObject.translation;
	}

	set backgroundColor(color: number[]) {
		this._baseObject.backgroundColor = color;
	}

	get backgroundColor(): number[] {
		return this._baseObject.backgroundColor;
	}

	set borderWidth(width: number) {
		this._baseObject.borderWidth = width;
	}

	get borderWidth(): number {
		return this._baseObject.borderWidth;
	}

	set borderColor(color: number[]) {
		this._baseObject.borderColor = color;
	}

	get borderColor(): number[] {
		return this._baseObject.borderColor;
	}

	private createFontObjs() {
		this._fontObjects.forEach(obj => obj.hide());
		this._fontObjects = [];
		const len = this._text.length;
		const s = this._size;
		for(let i = 0; i < len; i ++) {
			let obj = this._g.instance();
			obj.show();
			let texture = this._textureMap.get(this._text[i]);
			obj.backgroundColor = [255,255,0,128];
			obj.texture = texture;
			obj.vertexOffsetValue = [s, s];
			this._fontObjects.push(obj);
		}
	}

	private setBaseSize() {
		const len = this._text.length;
		const s = this._size;
		this._baseObject.vertexOffsetValue = [s*len, s];
	}

	private setFontObjsTranslation() {
		const o = this._baseObject.translation;
		const s = this._size;
		this._fontObjects.forEach((obj, k) => obj.translation = [k * s + o[0], o[1]]);
	}
}