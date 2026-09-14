/*
 * The runner. Steps are listed in dependency order — foundations, then the
 * vocabulary, then the screens that are composed from it — and each one is
 * idempotent: it rebuilds its own section and touches nothing else.
 */

const STEPS = [
	{
		id: 'foundations-spacing',
		label: 'Foundations — spacing and radius',
		run: stepFoundationsSpacing
	},
	{ id: 'atoms', label: 'Components — atoms and glyphs', run: stepAtoms },
	{ id: 'controls', label: 'Components — controls', run: stepControls },
	{ id: 'surfaces', label: 'Components — surfaces and layers', run: stepSurfaces },
	{ id: 'data', label: 'Components — data marks', run: stepData },
	{ id: 'screen-auth', label: 'Screens — signup and the landing', run: stepScreenAuth },
	{ id: 'screen-dashboard', label: 'Screens — dashboard', run: stepScreenDashboard },
	{ id: 'screen-transactions', label: 'Screens — transactions', run: stepScreenTransactions }
];

figma.showUI(__html__, { width: 360, height: 620 });
figma.ui.postMessage({
	type: 'steps',
	steps: STEPS.map((step) => ({ id: step.id, label: step.label }))
});

async function runStep(index) {
	const step = STEPS[index];
	try {
		await loadTokens();
		const message = await step.run();
		figma.ui.postMessage({ type: 'done', index: index, ok: true, message: message });
		return true;
	} catch (error) {
		const detail = error && error.message ? error.message : String(error);
		figma.ui.postMessage({
			type: 'done',
			index: index,
			ok: false,
			message: `${step.label}: ${detail}`
		});
		return false;
	}
}

figma.ui.onmessage = async (message) => {
	if (message.type === 'run') {
		const index = STEPS.findIndex((step) => step.id === message.id);
		if (index >= 0) await runStep(index);
		return;
	}

	if (message.type === 'run-all') {
		for (let i = 0; i < STEPS.length; i++) {
			// Stop at the first failure: later steps compose the earlier ones, so
			// carrying on would build on something broken.
			const ok = await runStep(i);
			if (!ok) return;
		}
	}
};
