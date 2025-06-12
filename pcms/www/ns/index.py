import frappe

def get_context(context):
    user = frappe.session.user
    context.station = {}

    if user != "Guest":
        station = frappe.db.get_value(
            "Nursing Station",
            {"user_id": user},
            "name",
            as_dict=True
        )
        if station:
            context.station = station

    return context

