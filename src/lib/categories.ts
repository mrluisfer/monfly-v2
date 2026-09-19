import ColorBanknote from '@animated-color-icons/lucide-svelte/Banknote.svelte';
import ColorCar from '@animated-color-icons/lucide-svelte/Car.svelte';
import ColorCreditCard from '@animated-color-icons/lucide-svelte/CreditCard.svelte';
import ColorGamepad2 from '@animated-color-icons/lucide-svelte/Gamepad2.svelte';
import ColorGift from '@animated-color-icons/lucide-svelte/Gift.svelte';
import ColorGraduationCap from '@animated-color-icons/lucide-svelte/GraduationCap.svelte';
import ColorHandCoins from '@animated-color-icons/lucide-svelte/HandCoins.svelte';
import ColorHeartPulse from '@animated-color-icons/lucide-svelte/HeartPulse.svelte';
import ColorHouse from '@animated-color-icons/lucide-svelte/House.svelte';
import ColorPiggyBank from '@animated-color-icons/lucide-svelte/PiggyBank.svelte';
import ColorPlane from '@animated-color-icons/lucide-svelte/Plane.svelte';
import ColorShirt from '@animated-color-icons/lucide-svelte/Shirt.svelte';
import ColorShoppingCart from '@animated-color-icons/lucide-svelte/ShoppingCart.svelte';
import ColorSmartphone from '@animated-color-icons/lucide-svelte/Smartphone.svelte';
import ColorUtensilsCrossed from '@animated-color-icons/lucide-svelte/UtensilsCrossed.svelte';
import ColorZap from '@animated-color-icons/lucide-svelte/Zap.svelte';
import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
import MovingTag from '@jis3r/icons/icons/tag';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import Banknote from '@lucide/svelte/icons/banknote';
import Car from '@lucide/svelte/icons/car';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
import Gift from '@lucide/svelte/icons/gift';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import HandCoins from '@lucide/svelte/icons/hand-coins';
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
import type { Glyph } from './components/ui/AnimatedIcon.svelte';
import { PALETTE_COLORS, type PaletteColor } from './components/ui/palette';

/**
 * What a category wears: a Lucide glyph — still, and the same drawing from the
 * animated set for where it moves — and a palette colour.
 *
 * Categories are free text — v1 lets people type their own, in whichever
 * language they think in — so there is no list to key off. A kind is
 * recognised by the words in the name instead, and the first kind whose words
 * appear wins, so `KINDS` reads most specific first. Anything unrecognised is
 * still a category with a colour of its own: see `categoryColor`.
 *
 * Adding a kind is one entry here — its two glyphs, its colour, the words that
 * mean it — and every table that draws categories picks it up.
 */
type Kind = {
	icon: typeof Tag;
	/** The same drawing from an animated set, for where the glyph moves. */
	animated: Glyph;
	color: PaletteColor;
	/** Lowercase, accent-free fragments; a name containing any of them is this kind. */
	words: string[];
};

const KINDS: Kind[] = [
	{
		icon: ArrowLeftRight,
		animated: { icon: MovingArrowLeftRight, set: 'moving' },
		color: 'lavender',
		words: ['transferencia', 'transfer', 'traspaso', 'envio', 'deposito']
	},
	{
		// A loan's payments, filed under "Loan" by the loans page, in the Loans shortcut's colour.
		icon: HandCoins,
		animated: { icon: ColorHandCoins, set: 'color' },
		color: 'lemon',
		words: ['prestamo', 'loan', 'deuda', 'debt', 'adeudo']
	},
	{
		icon: Banknote,
		animated: { icon: ColorBanknote, set: 'color' },
		color: 'mint',
		words: ['ingreso', 'sueldo', 'salario', 'nomina', 'pago recibido', 'income', 'salary']
	},
	{
		icon: PiggyBank,
		animated: { icon: ColorPiggyBank, set: 'color' },
		color: 'teal',
		words: ['ahorro', 'saving', 'inversion', 'invest']
	},
	{
		icon: UtensilsCrossed,
		animated: { icon: ColorUtensilsCrossed, set: 'color' },
		color: 'coral',
		words: ['comida', 'food', 'restaurante', 'cena', 'desayuno', 'almuerzo', 'taco', 'cafe']
	},
	{
		icon: ShoppingCart,
		animated: { icon: ColorShoppingCart, set: 'color' },
		color: 'peach',
		words: ['despensa', 'super', 'mercado', 'grocer', 'oxxo', 'tienda', 'compra', 'shopping']
	},
	{
		icon: Car,
		animated: { icon: ColorCar, set: 'color' },
		color: 'sky',
		words: ['uber', 'taxi', 'gasolina', 'transporte', 'transport', 'didi', 'metro', 'auto']
	},
	{
		icon: Smartphone,
		animated: { icon: ColorSmartphone, set: 'color' },
		color: 'blue',
		words: ['telcel', 'recarga', 'celular', 'telefono', 'movil', 'phone', 'at&t']
	},
	{
		icon: Zap,
		animated: { icon: ColorZap, set: 'color' },
		color: 'lemon',
		words: ['servicio', 'luz', 'agua', 'gas', 'internet', 'cfe', 'utilit']
	},
	{
		icon: CreditCard,
		animated: { icon: ColorCreditCard, set: 'color' },
		color: 'violet',
		words: ['suscripcion', 'subscription', 'spotify', 'netflix', 'icloud', 'claude', 'plan']
	},
	{
		icon: Gamepad2,
		animated: { icon: ColorGamepad2, set: 'color' },
		color: 'pink',
		words: ['juego', 'game', 'entretenimiento', 'steam', 'cine']
	},
	{
		icon: House,
		animated: { icon: ColorHouse, set: 'color' },
		color: 'lime',
		words: ['casa', 'hogar', 'renta', 'hipoteca', 'home', 'rent']
	},
	{
		icon: HeartPulse,
		animated: { icon: ColorHeartPulse, set: 'color' },
		color: 'rose',
		words: ['salud', 'medico', 'farmacia', 'doctor', 'health']
	},
	{
		icon: Shirt,
		animated: { icon: ColorShirt, set: 'color' },
		color: 'pink',
		words: ['ropa', 'clothes', 'zapato', 'moda']
	},
	{
		icon: GraduationCap,
		animated: { icon: ColorGraduationCap, set: 'color' },
		color: 'sky',
		words: ['educacion', 'escuela', 'curso', 'libro', 'school', 'course']
	},
	{
		icon: Plane,
		animated: { icon: ColorPlane, set: 'color' },
		color: 'teal',
		words: ['viaje', 'vuelo', 'hotel', 'travel', 'flight']
	},
	{
		icon: Gift,
		animated: { icon: ColorGift, set: 'color' },
		color: 'lavender',
		words: ['regalo', 'gift', 'donacion', 'propina']
	}
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

/** The same glyph where it moves, with the set that plays it. */
export const categoryGlyph = (name: string): Glyph =>
	kindOf(name)?.animated ?? { icon: MovingTag, set: 'moving' };

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
