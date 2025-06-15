import frappe
from frappe import _

def get_context(context):
    context.no_cache = 1

    # Default structure for patient data
    context.patient = {
        "name": "",
        "patient_name": "",
        "mr_no": "",
        "nursing_station": "",
    }

    user = frappe.session.user or ""
    if user == "Guest":
        return context  # Guest users see an empty/default context

    try:
        # Retrieve the most recent patient record tied to the user
        patient = frappe.db.get_value(
            "Patient",
            {"user_id": user},
            ["name", "patient_name", "mr_no", "nursing_station"],
            as_dict=True
        )
        if patient:
            context.patient = patient
    except Exception as e:
        frappe.log_error(
            frappe.get_traceback(),
            _("Error fetching patient data for user {0}").format(user)
        )

    return context
