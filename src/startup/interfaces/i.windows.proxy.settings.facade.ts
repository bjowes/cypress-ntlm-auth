import { WindowsProxySettings } from "../windows.proxy.settings.model";

export interface IWindowsProxySettingsFacade {
    get() : WindowsProxySettings | undefined
}