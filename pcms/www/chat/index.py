import frappe

def get_context(context):
    context.no_cache = 1
    context.patient = {
        "name": "",
        "patient_name": "",
        "mr_no": "",
        "nursing_station": "",
    }
    
    if not frappe.session.user or frappe.session.user == "Guest":
        return context
    
    try:
        # Get the most recent patient record for this user
        context.patient = frappe.get_value(
            "Patient",
            filters={"user_id": frappe.session.user},
            fieldname=["name", "patient_name", "mr_no", "nursing_station"],
            as_dict=True,
            order_by="creation desc"
        )
        
    except Exception as e:
        frappe.log_error(f"Error fetching patient data for user {frappe.session.user}: {e}", "Patient Context Error")
        # Consider showing a user-friendly message if needed
    
    return context