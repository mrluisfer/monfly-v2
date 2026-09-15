import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/outfit';
import '../src/app.css';

import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview, SvelteRenderer } from '@storybook/sveltekit';

/**
 * Stories draw on the app's own ground: its fonts and tokens, the canvas grey
 * that app.css paints behind everything, and `.dark` on <html> from the
 * toolbar, where mode-watcher puts it in the app. No control matchers: a
 * `color` prop here is a palette name and a `date` an ISO string, and the
 * default matchers would hand them a colour picker and a timestamp.
 */
const preview: Preview = {
	parameters: {
		layout: 'centered',
		// app.css paints the canvas; the addon's backgrounds would cover it.
		backgrounds: { disable: true }
	},
	decorators: [
		withThemeByClassName<SvelteRenderer>({
			themes: { light: '', dark: 'dark' },
			defaultTheme: 'light'
		})
	]
};

export default preview;
