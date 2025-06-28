import frappe

@frappe.whitelist()
def get_app_settings():
    """
    Returns all fields from the Single DocType 'App Settings' as a clean JSON object.
    """
    try:
        settings = frappe.get_single("App Settings")
        data = settings.as_dict()

        # Remove internal/meta keys if they aren't needed
        for internal_key in ("doctype", "name", "owner", "creation", "modified", "modified_by", "__onload"):
            data.pop(internal_key, None)

        return data or {}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_app_settings")
        return {}
