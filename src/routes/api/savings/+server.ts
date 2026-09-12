import { error, json } from '@sveltejs/kit';
import { MAX_GOAL, currentMonth, isSavingsAmount, toCurrency } from '$lib/finance';
import { requireMonflyUser } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { addSavingsTransfer, addToSavings, getSavings, setSavingsGoal } from '$lib/server/finance';
import type { RequestHandler } from './$types';

const HEADERS = { 'cache-control': 'private, no-store' };

/** What every handler answers with, read in the viewer's time zone. */
const readFor = (
	profile: { email: string; preferredCurrency: string | null },
	timeZone: string
) => ({
	userEmail: profile.email,
	currency: toCurrency(profile.preferredCurrency),
	month: currentMonth(timeZone),
	timeZone
});

/** The JSON body these endpoints take; `what` names it in the error. */
async function readBody(request: Request, what: string): Promise<Record<string, unknown>> {
	if (!request.headers.get('content-type')?.startsWith('application/json')) {
		error(415, `Send the ${what} as JSON`);
	}
	const body: unknown = await request.json().catch(() => undefined);
	return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

/** The signed-in person's savings goal and what's in it. */
export const GET: RequestHandler = async ({ locals }) => {
	const profile = await requireMonflyUser(locals);
	const savings = await getSavings(db, readFor(profile, locals.timeZone));
	return json(savings, { headers: HEADERS });
};

/**
 * Sets what they plan to save: `{ "goal": 1300000 }` in cents, or
 * `{ "goal": null }` to clear it — which keeps whatever is already saved.
 */
export const PUT: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);
	const goal = (await readBody(request, 'goal')).goal;
	if (goal !== null && !isSavingsAmount(goal)) {
		error(400, `goal must be null or whole cents from 1 to ${MAX_GOAL}`);
	}

	await setSavingsGoal(db, { userEmail: profile.email, goal });
	return json(await getSavings(db, readFor(profile, locals.timeZone)), { headers: HEADERS });
};

/**
 * Puts more away: `{ "amount": 45000 }` in cents. With an account linked it is
 * a transfer and `from` names the account it leaves — the total balance does
 * not move. Without one, it is added to the pot's own tally.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const profile = await requireMonflyUser(locals);
	const read = readFor(profile, locals.timeZone);

	const body = await readBody(request, 'amount');
	const amount = body.amount;
	if (!isSavingsAmount(amount)) {
		error(400, `amount must be whole cents from 1 to ${MAX_GOAL}`);
	}

	const savings = await getSavings(db, read);

	if (savings.account) {
		const from = body.from;
		if (typeof from !== 'string' || from === '') {
			error(400, 'from must name the account the money leaves');
		}
		const moved = await addSavingsTransfer(db, { userEmail: profile.email, amount, from });
		if (!moved) error(409, 'That account cannot send money to your savings account');
	} else {
		const added = await addToSavings(db, { userEmail: profile.email, amount });
		if (!added) error(409, 'Set a savings goal before adding to it');
	}

	return json(await getSavings(db, read), { headers: HEADERS });
};
