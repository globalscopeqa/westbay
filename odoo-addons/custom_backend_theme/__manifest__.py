{
    'name': 'Backend Theme (Custom)',
    'version': '19.0.1.0.0',
    'summary': 'Custom backend re-skin: app icon grid, rounded navbar, accent color scheme',
    'category': 'Themes/Backend',
    'license': 'LGPL-3',
    'depends': ['web'],
    'data': [],
    'assets': {
        'web.assets_backend': [
            'custom_backend_theme/static/src/scss/theme.scss',
            'custom_backend_theme/static/src/webclient/navbar/navbar_patch.xml',
            'custom_backend_theme/static/src/webclient/navbar/navbar_patch.scss',
            'custom_backend_theme/static/src/webclient/navbar/navbar_patch.js',
            'custom_backend_theme/static/src/webclient/home_menu/home_menu.xml',
            'custom_backend_theme/static/src/webclient/home_menu/home_menu.scss',
            'custom_backend_theme/static/src/webclient/home_menu/home_menu.js',
            'custom_backend_theme/static/src/webclient/home_menu/home_menu_state.js',
            'custom_backend_theme/static/src/webclient/webclient_patch.xml',
            'custom_backend_theme/static/src/webclient/webclient_patch.js',
        ],
        'web.assets_frontend': [
            'custom_backend_theme/static/src/scss/frontend_login.scss',
        ],
    },
    'installable': True,
    'application': False,
}
