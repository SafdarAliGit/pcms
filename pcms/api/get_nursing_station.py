import frappe

@frappe.whitelist()
def get_nursing_station(user=None):
      
    station = frappe.db.get_value(
        "Nursing Station",
        {"user_id": user},
        "name"
    )
    return station  