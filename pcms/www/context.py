import frappe

def add_station(context):
    if frappe.session.user != "Guest":
        station = frappe.db.get_value("Nursing Station",
                                      {"user_id": frappe.session.user},
                                      "name", as_dict=True)
        context.station = station or {}


