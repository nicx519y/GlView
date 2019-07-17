import { OutViewportStatus } from "./render-object";
import { Engine } from "./engine";
import { DisplayStatus } from './utils';

export interface GeneratorInterface {
	readonly engine: Engine;
	display: DisplayStatus;
	instance(): ComponentInterface;
	destroy(): void;
	clear(): void;
}

export interface ComponentInterface {
	readonly id: string;
	readonly isShown: boolean;
	opacity: number;
	display: DisplayStatus;
	outViewportStatus: OutViewportStatus;
	attachViewportScale: boolean;
	attachViewportTranslation: boolean;
	show(): ComponentInterface;
	hide(): ComponentInterface;
}