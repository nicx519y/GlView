export interface GeneratorInterface {
	readonly engine;
	instance(): ComponentInterface;
	destroy(): void;
	clear(): void;
}

export interface ComponentInterface {
	readonly id: string;
	readonly isShown: boolean;
	show(): ComponentInterface;
	hide(): ComponentInterface;
}