import frappe

@frappe.whitelist()
def get_nursing_station():
        station = frappe.db.get_value(
            "Nursing Station", 
            {"user_id": frappe.session.user}, 
            "name"
        )
        return station    