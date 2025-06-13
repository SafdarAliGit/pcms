import frappe

def get_context(context):
    context.no_cache = 1

    user = frappe.session.user
    if user and user != "Guest":
        # Fetch the most recently created patient record for this user
        patients = frappe.db.get_list(
            "Patient",
            filters={"user_id": user},
            fields=["patient_name", "mr_no", "nursing_station"],
            order_by="creation desc",
            page_length=1        # limit to just 1 result
        )
        if patients:
            context["patient"] = patients[0].patient_name  # first (and only) record
            context["mr_no"] = patients[0].mr_no
            context["nursing_station"] = patients[0].nursing_station

    return context
