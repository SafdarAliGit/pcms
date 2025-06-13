import frappe

def get_context(context):
    context.no_cache = 1
    user = frappe.session.user
    context.patient = {}

    if user != "Guest":
        patient = frappe.db.get_value(
            "Patient",
            {"user_id": user},
            ["patient_name", "mr_no"],
            as_dict=True,
            order_by="creation desc"
        )
        if patient:
            context.patient = patient

    return context

