import { UserData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs';
import FuzzySearch from "./FuzzySearch";
import { } from '../../common/Settings';

export { };

class DFSettingsClarity {
	static types = ["client", "world"];

	static patchGameSettings() {
		libWrapper.register('df-settings-clarity', 'ClientSettings.prototype.register', DFSettingsClarity.settingsRegister, 'WRAPPER');
		for (const pair of game.settings.settings) {
			pair[1].name = DFSettingsClarity.formatName(pair[1].name ?? '', pair[1]);
		}
	}

	static patchGameSettingsMenus() {
		libWrapper.register('df-settings-clarity', 'ClientSettings.prototype.registerMenu', DFSettingsClarity.settingsRegisterMenu, 'WRAPPER');
		for (const pair of game.settings.menus) {
			pair[1].name = DFSettingsClarity.formatName(pair[1].name ?? '', pair[1]);
		}
	}

	static formatName(name: string, data: ClientSettings.PartialSettingConfig<any> | ClientSettings.PartialSettingSubmenuConfig): string {
		if (name.startsWith('👤') || name.startsWith('🌎'))
			return name;
		let scope;
		if ((data as ClientSettings.PartialSettingConfig<any>).scope)
			scope = DFSettingsClarity.types.includes((data as ClientSettings.PartialSettingConfig<any>).scope)
				? (data as ClientSettings.PartialSettingConfig<any>).scope
				: "client";
		else if ((data as ClientSettings.PartialSettingSubmenuConfig).restricted)
			scope = (data as ClientSettings.PartialSettingSubmenuConfig) ? 'world' : 'client';
		else {
			console.warn('Unknown restriction/scope on registered setting for ' + name + '". Defaulting to "client"');
			scope = 'client';
		}
		if (scope === 'client') return !name ? '👤' : '👤 ' + game.i18n.localize(name);
		else if (scope === 'world') return !name ? '🌎' : '🌎 ' + game.i18n.localize(name);
		return name;
	}

	static settingsRegister(this: ClientSettings, wrapper: AnyFunction, module: string, key: string, data: ClientSettings.PartialSettingConfig<any>) {
		data.name = DFSettingsClarity.formatName(data.name ?? '', data);
		wrapper(module, key, data);
	}

	static settingsRegisterMenu(this: ClientSettings, wrapper: AnyFunction, module: string, key: string, data: ClientSettings.PartialSettingSubmenuConfig) {
		data.name = DFSettingsClarity.formatName(data.name ?? '', data);
		wrapper(module, key, data);
	}

	static showWorldHover(event: JQuery.MouseMoveEvent) {
		if (event.clientX > $(event.target).offset().left + 30) DFSettingsClarity.hideHover();
		else DFSettingsClarity.showHover($(event.target), 'world');
	}
	static showClientHover(event: JQuery.MouseMoveEvent) {
		if (event.clientX > $(event.target).offset().left + 30) DFSettingsClarity.hideHover();
		else DFSettingsClarity.showHover($(event.target), 'client');
	}
	static hover = $(`<div class="df-settings-clarity-tooltip" style="visibility:hidden"><span class="msg"></span><img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMzAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtMCAwLjVhMTEuNDA4IDExLjQwOCAyNC4wNTcgMCAxIDcuNjUxNCAzLjQxNThsMTEuODQ5IDExLjA4NC0xMS44NDkgMTEuMDg0YTExLjQwOCAxMS40MDggMTU1Ljk0IDAgMS03LjY1MTQgMy40MTU4IiBmaWxsPSIjMDAwMDAwQmYiIHN0cm9rZT0iI2Y2MCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=="></div>`);
	static showHover(element: JQuery<HTMLElement>, scope: string) {
		const hover = DFSettingsClarity.hover;
		if (hover.parent().length != 0) return;
		hover.find('span.msg').text(game.i18n.localize('DF_SETTINGS_CLARITY.Scope_' + scope));
		$(document.body).append(hover);
		const css = {
			position: 'absolute',
			left: `${element.offset().left - hover.outerWidth()}px`,
			top: `${element.offset().top - 15}px`
		};
		hover.css(css);
	}
	static hideHover() {
		if (DFSettingsClarity.hover.parent().length == 0) return;
		DFSettingsClarity.hover.remove();
	}
}

Hooks.once('init', function () {
	FuzzySearch.init();
});

Hooks.once('setup', function () {
	const user = game.data.users.find(x => x._id === game.userId) as any as UserData;
	const perms: { [key: string]: number[] } = game.settings.get('core', 'permissions');
	if (!!user && perms['SETTINGS_MODIFY'].includes(user.role)) {
		DFSettingsClarity.patchGameSettings();
		DFSettingsClarity.patchGameSettingsMenus();
	}
	$(document.body).append(DFSettingsClarity.hover);
});
Hooks.once('ready', function () {
	if (!game.modules.get('lib-wrapper')?.active) {
		console.error('Missing libWrapper module dependency');
		if (game.user.isGM)
			ui.notifications.error(game.i18n.localize('DF_SETTINGS_CLARITY.errorLibWrapperMissing'));
		return;
	}
	DFSettingsClarity.hover.remove();
	DFSettingsClarity.hover.attr("style", "");
});

Hooks.on('renderSettingsConfig', function (_app: any, html: JQuery<HTMLElement>, _data: any) {
	const world = html.find("label:contains('🌎')");
	world.on('mousemove', DFSettingsClarity.showWorldHover);
	world.on('mouseleave', DFSettingsClarity.hideHover);
	const client = html.find("label:contains('👤')");
	client.on('mousemove', DFSettingsClarity.showClientHover);
	client.on('mouseleave', DFSettingsClarity.hideHover);
});