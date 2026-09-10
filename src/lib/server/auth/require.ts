import { error } from '@sveltejs/kit';
import type { MonflyUser } from './profile';

/**
 * The Monfly account behind a request, for endpoints and actions that touch
 * its data. 401 without a session; 403 for a session no `User` row is linked
 * to yet (a new Auth0 user).
 */
export async function requireMonflyUser(locals: App.Locals): Promise<MonflyUser> {
	if (!locals.session) error(401, 'Sign in to continue');
	const profile = await locals.getMonflyUser();
	if (!profile) error(403, 'No Monfly account is linked to this session');
	return profile;
}
