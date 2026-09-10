export type Fetch = typeof fetch;

/** A non-2xx answer from one of our endpoints; `message` is the server's. */
export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

async function readJson<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const body: { message?: string } | null = await response.json().catch(() => null);
		throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`);
	}
	return response.json();
}

/** GETs one of our JSON endpoints, throwing `ApiError` on anything but 2xx. */
export async function getJson<T>(url: string, fetcher: Fetch = fetch): Promise<T> {
	return readJson(await fetcher(url, { headers: { accept: 'application/json' } }));
}

/** Sends a JSON body to one of our endpoints — same error contract as `getJson`. */
export async function sendJson<T>(
	url: string,
	method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	body: unknown,
	fetcher: Fetch = fetch
): Promise<T> {
	return readJson(
		await fetcher(url, {
			method,
			headers: { accept: 'application/json', 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	);
}
