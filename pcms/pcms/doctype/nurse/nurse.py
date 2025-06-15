# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Nurse(Document):
	pass

def create_nurse_user(doc, method):
    # Avoid creating user if already linked
    if doc.user_id:
        return

    # Avoid creating user if one already exists with the same email
    if frappe.db.exists("User", doc.email):
        user = frappe.get_doc("User", doc.email)
    else:
        user = frappe.get_doc({
            "doctype": "User",
            "email": doc.email,
            "first_name": doc.nurse_name,
            "send_welcome_email": 0,
            "roles": [{"role": "Nurse"}, {"role": "Nursing Station"}],
            "user_type": "System User"
        })
        user.insert(ignore_permissions=True)
        # update_password(doc.email, doc.mr_no)  # or doc.mr_number

    # Link user to doctor doc without triggering another save loop
    frappe.db.set_value("Nurse", doc.name, "user_id", user.name)
