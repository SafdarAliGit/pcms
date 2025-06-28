import frappe

@frappe.whitelist()
def get_app_settings():
    # Fetch the limit value from a Single DocType named "App Settings"
    app_settings = frappe.db.get_single_value("App Settings")
    return app_settings
