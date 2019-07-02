export interface GeneratorInterface {
	instance(): ComponentInterface;
	destroy();
}

export interface ComponentInterface {
	readonly id: string;
	readonly isShown: boolean;
	show(): ComponentInterface;
	hide(): ComponentInterface;
}