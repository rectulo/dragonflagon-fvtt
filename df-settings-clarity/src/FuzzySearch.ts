import { } from "../libs/fuzzysort";

declare global {
	interface Application {
		_recalculateDimensions(): void;
	}
}

(<any>Application.prototype)._recalculateDimensions = function () {
	this.element[0].style.height = '';
	this.setPosition({});
};

abstract class SettingsProcessor {
	static readonly DELIM = ' `````` ';
	abstract processSettings(html: JQuery<HTMLElement>): void;
	abstract injectSearch(html: JQuery<HTMLElement>): JQuery<HTMLInputElement>;
	abstract performSearch(pattern: string): void;

	protected _updateLabels(text: string, div: JQuery<HTMLElement>, percentage?: number) {
		const [label, hint] = text.split(SettingsProcessor.DELIM);
		if (percentage !== undefined) {
			if (isNaN(percentage)) percentage = 0;
			const [redPerc, greenPerc] = percentage <= 0.5
				? [percentage / 0.5, 1] // <= 0.5, calc green to yellow
				: [1, 1 - ((percentage - 0.5) / 0.5)]; // > 0.5, calc yellow to red
			const red = Math.round(redPerc * 255).toString(16).padStart(2, '0');
			const green = Math.round(greenPerc * 255).toString(16).padStart(2, '0');
			div.css('border-left', `thick solid #${red}${green}00`);
			div.css('padding-left', '6px');
		}
		else {
			div.css('border-left', '');
			div.css('padding-left', '');
		}
		div.find('>label').html(label);
		if (div[0].classList.contains('submenu'))
			div.find('button>label').html(hint);
		else
			div.find('.notes').html(hint);
	}
	protected _getOptions(query: string): Fuzzysort.KeysOptions<any> {
		const threshold = Math.min(100000, 10000 + (query.length * 10000));
		return {
			keys: ['text'],
			limit: Infinity,
			threshold: -threshold,
			allowTypo: false,
		};
	}
}

interface DefaultModuleItem { el: JQuery<HTMLElement>, text: string }
class DefaultSettingsProcessor extends SettingsProcessor {
	private _settings: DefaultModuleItem[] = [];
	private _getMenuData(div: JQuery<HTMLElement>): DefaultModuleItem {
		return {
			el: div,
			text: $(div).find('>label').text()
				+ SettingsProcessor.DELIM + $(div).find('button').find('label').text()
				+ SettingsProcessor.DELIM + $(div).find('.notes').text(),
		};
	}
	private _getRegularData(div: JQuery<HTMLElement>): DefaultModuleItem {
		return {
			el: div,
			text: $(div).find('>label').text() + SettingsProcessor.DELIM + $(div).find('.notes').text(),
		};
	}
	processSettings(html: JQuery<HTMLElement>) {
		const children = html.find('.categories > .scrollable').children();
		children.each((_, section: HTMLElement) => {
			$(section).children().each((_, element: HTMLElement) => {
				if (element instanceof HTMLHeadingElement) return;
				else {
					if (element.classList.contains('submenu'))
						this._settings.push(this._getMenuData($(element)));
					else
						this._settings.push(this._getRegularData($(element)));
				}
			});
		});
	}
	injectSearch(html: JQuery<HTMLElement>): JQuery<HTMLInputElement> {
		return html.find<HTMLInputElement>('input[name="filter"]');
	}
	performSearch(pattern: string) {
		if (pattern.length < 2) {
			for (const item of this._settings) {
				item.el.show();
				this._updateLabels(item.text, item.el);
			}
			return;
		}
		const results = fuzzysort.go(pattern, this._settings, this._getOptions(pattern));
		for (let c = 0; c < this._settings.length; c++) {
			const resultIdx = results.findIndex(x => x.obj === this._settings[c]);
			let text: string;
			let percentage: number = undefined;
			if (resultIdx >= 0) {
				this._settings[c].el.show();
				text = fuzzysort.highlight(results[resultIdx][0]);
				percentage = resultIdx / (results.length - 1);
			}
			else {
				this._settings[c].el.hide();
				text = this._settings[c].text;
			}
			this._updateLabels(text, this._settings[c].el, percentage);
		}
	}
}

export default class FuzzySearch {
	private static _settingsProcessor: SettingsProcessor = null;
	static init() {
		Hooks.on('renderSettingsConfig', (_settingsConfig: SettingsConfig, html: JQuery<HTMLElement>, _data: any) => {
			// Process entire settings list
			this._settingsProcessor = new DefaultSettingsProcessor();
			this._settingsProcessor.processSettings(html);
			// Add the search box to the view
			const searchField = this._settingsProcessor.injectSearch(html);
			// Activate listeners
			searchField.on('input', function () {
				FuzzySearch._settingsProcessor.performSearch(<string>$(this).val());
			});
			_settingsConfig._recalculateDimensions();
		});
	}
}
// add weights to the strings. Names have higher priority than Hints