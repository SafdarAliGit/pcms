import frappe
from frappe import _
@frappe.whitelist()
def update_message(name, treatment, status):
    _check_nurse_role()
    msg = frappe.get_doc('Message', name)
    msg.treatment = treatment
    msg.status = status
    msg.attended_by = frappe.session.user
    msg.attended_by_name = frappe.get_value('Nurse', {"user_id": frappe.session.user}, 'nurse_name')
    if not msg.attended_time:
        msg.attended_time = frappe.utils.now()
    msg.save(ignore_permissions=True)
    frappe.db.commit()
    return {'status': status}


def _check_nurse_role():
    if "Nurse" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Only Nurses can perform this action"))
