import { injectable } from "inversify";
import { WindowsProxySettings } from "./windows.proxy.settings.model";
import { IWindowsProxySettingsFacade } from "./interfaces/i.windows.proxy.settings.facade";

const getWindowsProxy = require('@cypress/get-windows-proxy');

@injectable()
export class WindowsProxySettingsFacade implements IWindowsProxySettingsFacade {
    get() : WindowsProxySettings | undefined {
        return getWindowsProxy();
    }
}
