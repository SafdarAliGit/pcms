import frappe

def get_context(context):
    context.no_cache = 1
    user = frappe.session.user
    if user and user != "Guest":
        station = frappe.db.get_value(
            "Nursing Station",
            {"user_id": user},
            "name"
        )
        context["station"] = station or ""
    else:
        context["station"] = ""
    return context