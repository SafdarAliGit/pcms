import frappe

# Ensure this flag is set for the page-level cache control
no_cache = 1

def get_context(context):
    # Disable caching for this page
    context.no_cache = 1

    # Default empty patient info
    context.patient = {}

    user = frappe.session.user
    if user and user != "Guest":
        # Use get_last_doc for the most recent patient
        patient = frappe.get_last_doc(
            "Patient",
            filters={"user_id": user},
            fields=["patient_name", "mr_no", "nursing_station"]
        )
        if patient:
            # If it's a Document, convert to dict
            context.patient = patient.as_dict() if hasattr(patient, "as_dict") else patient
    return context
