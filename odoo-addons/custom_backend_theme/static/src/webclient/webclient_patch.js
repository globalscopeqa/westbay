import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";
import { CustomHomeMenu } from "./home_menu/home_menu";
import { homeMenuState } from "./home_menu/home_menu_state";

WebClient.template = "custom_backend_theme.WebClient";
WebClient.components = { ...WebClient.components, CustomHomeMenu };

patch(WebClient.prototype, {
    setup() {
        super.setup();
        this.homeMenuState = useState(homeMenuState);
    },
    closeHomeMenu() {
        this.homeMenuState.isOpened = false;
    },
    _loadDefaultApp() {
        // Community normally auto-opens the first app; show the home
        // menu grid as the landing screen instead, matching Enterprise's
        // default behavior.
        this.homeMenuState.isOpened = true;
    },
});
