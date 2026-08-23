import { reactive } from "@odoo/owl";

export const homeMenuState = reactive({ isOpened: false });

export function setHomeMenuOpened(value) {
    homeMenuState.isOpened = value;
}
