import frappe

def get_context(context):
    context.no_cache = 1
    user = frappe.session.user

    if user and user != "Guest":
        patient = frappe.db.get_list(
            "Patient",
            {"user_id": user},
            ["patient_name", "mr_no", "nursing_station"],
            as_dict=True,
            order_by="creation desc",
            limit=1
        )
        if patient:
            context["patient"] = patient[0].patient_name
            context["mr_no"] = patient[0].mr_no
            context["nursing_station"] = patient[0].nursing_station

    return context

