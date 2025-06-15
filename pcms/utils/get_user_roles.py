
import frappe

@frappe.whitelist()
def get_user_roles(user=None):
    user = user or frappe.session.user
    roles = frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parenttype='User' AND parent = %s", user)
    return roles