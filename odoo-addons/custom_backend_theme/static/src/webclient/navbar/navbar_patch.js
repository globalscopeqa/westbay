import { useState } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { NavBar } from "@web/webclient/navbar/navbar";
import { homeMenuState } from "../home_menu/home_menu_state";

NavBar.template = "custom_backend_theme.NavBar";

patch(NavBar.prototype, {
    setup() {
        super.setup();
        this.homeMenuState = useState(homeMenuState);
    },
    toggleHomeMenu() {
        this.homeMenuState.isOpened = !this.homeMenuState.isOpened;
    },
});
