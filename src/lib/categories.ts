import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import Banknote from '@lucide/svelte/icons/banknote';
import Car from '@lucide/svelte/icons/car';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
import Gift from '@lucide/svelte/icons/gift';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import House from '@lucide/svelte/icons/house';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Plane from '@lucide/svelte/icons/plane';
import Shirt from '@lucide/svelte/icons/shirt';
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Tag from '@lucide/svelte/icons/tag';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
import Zap from '@lucide/svelte/icons/zap';
import { PALETTE_COLORS, type PaletteColor } from './components/ui/palette';

/**
 * What a category wears: a Lucide glyph and a palette colour.
 *
 * Categories are free text — v1 lets people type their own, in whichever
 * language they think in — so there is no list to key off. A kind is
 * recognised by the words in the name instead, and the first kind whose words
 * appear wins, so `KINDS` reads most specific first. Anything unrecognised is
 * still a category with a colour of its own: see `categoryColor`.
 *
 * Adding a kind is one entry here — its glyph, its colour, the words that mean
 * it — and every table that draws categories picks it up.
 */
type Kind = {
	icon: typeof Tag;
	color: PaletteColor;
	/** Lowercase, accent-free fragments; a name containing any of them is this kind. */
	words: string[];
};

const KINDS: Kind[] = [
	{
		icon: ArrowLeftRight,
		color: 'lavender',
		words: ['transferencia', 'transfer', 'traspaso', 'envio', 'deposito']
	},
	{
		icon: Banknote,
		color: 'mint',
		words: ['ingreso', 'sueldo', 'salario', 'nomina', 'pago recibido', 'income', 'salary']
	},
	{ icon: PiggyBank, color: 'teal', words: ['ahorro', 'saving', 'inversion', 'invest'] },
	{
		icon: UtensilsCrossed,
		color: 'coral',
		words: ['comida', 'food', 'restaurante', 'cena', 'desayuno', 'almuerzo', 'taco', 'cafe']
	},
	{
		icon: ShoppingCart,
		color: 'peach',
		words: ['despensa', 'super', 'mercado', 'grocer', 'oxxo', 'tienda', 'compra', 'shopping']
	},
	{
		icon: Car,
		color: 'sky',
		words: ['uber', 'taxi', 'gasolina', 'transporte', 'transport', 'didi', 'metro', 'auto']
	},
	{
		icon: Smartphone,
		color: 'blue',
		words: ['telcel', 'recarga', 'celular', 'telefono', 'movil', 'phone', 'at&t']
	},
	{
		icon: Zap,
		color: 'lemon',
		words: ['servicio', 'luz', 'agua', 'gas', 'internet', 'cfe', 'utilit']
	},
	{
		icon: CreditCard,
		color: 'violet',
		words: ['suscripcion', 'subscription', 'spotify', 'netflix', 'icloud', 'claude', 'plan']
	},
	{ icon: Gamepad2, color: 'pink', words: ['juego', 'game', 'entretenimiento', 'steam', 'cine'] },
	{ icon: House, color: 'lime', words: ['casa', 'hogar', 'renta', 'hipoteca', 'home', 'rent'] },
	{ icon: HeartPulse, color: 'rose', words: ['salud', 'medico', 'farmacia', 'doctor', 'health'] },
	{ icon: Shirt, color: 'pink', words: ['ropa', 'clothes', 'zapato', 'moda'] },
	{
		icon: GraduationCap,
		color: 'sky',
		words: ['educacion', 'escuela', 'curso', 'libro', 'school', 'course']
	},
	{ icon: Plane, color: 'teal', words: ['viaje', 'vuelo', 'hotel', 'travel', 'flight'] },
	{ icon: Gift, color: 'lavender', words: ['regalo', 'gift', 'donacion', 'propina'] }
];

/** Lowercase and accent-free, so "Educación" and "educacion" are the same word. */
const plain = (name: string) =>
	name
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

const kindOf = (name: string) => {
	const text = plain(name);
	return KINDS.find((kind) => kind.words.some((word) => text.includes(word)));
};

/** The glyph a category wears — a plain tag for a kind we don't know. */
export const categoryIcon = (name: string) => kindOf(name)?.icon ?? Tag;

/**
 * FNV-1a over the name, so a category we don't recognise still keeps one
 * colour: the same everywhere, and the same on the server as in the browser.
 */
function hash(name: string) {
	let h = 2166136261;
	for (let i = 0; i < name.length; i++) {
		h ^= name.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Every category has a colour: the person's own choice (`User.colors.category`)
 * first, then its kind's, and for a kind we don't know one drawn from the name
 * — the whole palette, not the four the dashboard's top ranks use, so a table
 * of forty categories isn't four colours over and over.
 */
export function categoryColor(
	name: string,
	chosen: Record<string, PaletteColor> = {}
): PaletteColor {
	return chosen[name] ?? kindOf(name)?.color ?? PALETTE_COLORS[hash(name) % PALETTE_COLORS.length];
}
