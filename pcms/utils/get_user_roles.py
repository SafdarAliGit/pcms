
import frappe

@frappe.whitelist()
def get_user_roles(user=None):
    user = user or frappe.session.user
    roles = frappe.get_roles(user)
    return roles