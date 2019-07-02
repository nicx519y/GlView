export interface GeneratorInterface {
	instance(): ComponentInterface;
}

export interface ComponentInterface {
	readonly id: string;
	readonly isShown: boolean;
	show(): ComponentInterface;
	hide(): ComponentInterface;
}