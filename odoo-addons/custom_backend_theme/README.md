# Backend Theme (Custom)

Original re-skin for Odoo 19 Community's backend — built from scratch using
only Community's own theming hooks (`t-inherit`, CSS variables, the existing
menu service). It does not reference or copy any Odoo Enterprise code.

## What it does

- Dark navy navbar (`#1e2a3a`) with a muted steel-teal accent (`#2c6e8f`)
  applied to buttons, the active-app highlight, and section tabs
- Full-page "Home Menu" app grid with search, used both as the startup
  screen and via a dedicated apps button in the navbar
- All dropdown menus (user menu, section sub-menus, breadcrumb "more" menu)
  restyled to match, instead of default light Bootstrap styling
- Login page (`/web/login`) accent color matched to the same palette

## Installation

1. Copy the `custom_backend_theme` folder into your Odoo `addons_path`
   (e.g. a custom addons directory referenced in `odoo.conf`).
2. Restart the Odoo service so it picks up the new addons path (if the
   directory wasn't already in `addons_path`).
3. Go to **Apps**, remove the default "Apps" filter, search for
   **"Backend Theme (Custom)"**, and click **Install**.
   Or from the command line:

   ```bash
   odoo --config /etc/odoo/odoo.conf -d <your_database> -i custom_backend_theme --stop-after-init
   ```

## Requirements

- Odoo 19.0 (Community or Enterprise — it only depends on the `web` module)
- No Python dependencies

## Customizing colors

Edit the CSS variables at the top of
`static/src/scss/theme.scss`:

```scss
:root {
    --ct-navbar-bg: #1e2a3a;   // navbar background
    --ct-navbar-text: #eef1f5; // navbar text
    --ct-accent: #2c6e8f;      // buttons, highlights
    --ct-radius: 6px;          // corner rounding
}
```

The login page uses its own copy of these values in
`static/src/scss/frontend_login.scss` (a separate asset bundle), so update
both files to keep the palette in sync.

## License

LGPL-3
