# your_app/www/context.py
import frappe

def add_station_to_context(context):
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
