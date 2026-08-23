import { Component, useState, useRef, onMounted } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class CustomHomeMenu extends Component {
    static template = "custom_backend_theme.HomeMenu";
    static props = {
        close: Function,
    };

    setup() {
        this.menuService = useService("menu");
        this.state = useState({ query: "" });
        this.inputRef = useRef("searchInput");
        onMounted(() => {
            this.inputRef.el?.focus();
        });
    }

    get filteredApps() {
        const apps = this.menuService.getApps();
        const query = this.state.query.trim().toLowerCase();
        if (!query) {
            return apps;
        }
        return apps.filter((app) => app.name.toLowerCase().includes(query));
    }

    async selectApp(app) {
        await this.menuService.selectMenu(app);
        this.props.close();
    }

    onKeydown(ev) {
        if (ev.key === "Escape") {
            this.props.close();
        }
    }
}
