import frappe

no_cache = 1  # disable page cache

def get_context(context):
    context.no_cache = 1
    context.patient = {}
    user = frappe.session.user

    if user and user != "Guest":
        patient_list = frappe.db.get_list(
            "Patient",
            filters={"user_id": user},
            fields=["patient_name", "mr_no", "nursing_station"],
            order_by="creation desc",
            limit_page_length=1
        )
        if patient_list:
            patient = patient_list[0]
            context.patient = patient
            context.station = patient.get("nursing_station")
            context.mr_no = patient.get("mr_no")

    return context
