import { OutViewportStatus } from "./render-object";
import { Engine } from "./engine";

export interface GeneratorInterface {
	readonly engine: Engine;
	instance(): ComponentInterface;
	destroy(): void;
	clear(): void;
}

export interface ComponentInterface {
	readonly id: string;
	readonly isShown: boolean;
	opacity: number;
	outViewportStatus: OutViewportStatus;
	show(): ComponentInterface;
	hide(): ComponentInterface;
}