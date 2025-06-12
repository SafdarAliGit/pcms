import frappe

@frappe.whitelist()
def get_nursing_station(**args):
        station = frappe.db.get_value(
            "Nursing Station", 
            {"user_id": args.get("user")}, 
            "name"
        )
        return station    