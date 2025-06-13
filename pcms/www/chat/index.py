import frappe

def get_context(context):
    context.no_cache = 1
    context.patient = {}

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
            context.patient = patients[0]  # first (and only) record

    return context
