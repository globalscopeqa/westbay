{
    'name': 'Global Scope Branding (Custom)',
    'version': '19.0.1.0.0',
    'summary': 'Replaces "Powered by Odoo" (login, database manager, portal pages) with Global Scope branding',
    'category': 'Themes/Backend',
    'license': 'LGPL-3',
    'depends': ['web'],
    'data': [
        'views/login_templates.xml',
        'views/brand_promotion_templates.xml',
    ],
    'installable': True,
    'application': False,
}
