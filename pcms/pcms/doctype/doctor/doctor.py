# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils.password import update_password



class Doctor(Document):
	pass


def create_doctor_user(doc, method):
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
            "first_name": doc.doctor_name,
            "send_welcome_email": 0,
            "roles": [{"role": "Doctor"}],
            "user_type": "System User"
        })
        user.insert(ignore_permissions=True)
        update_password(doc.email, doc.doctor_name)  # or doc.mr_number

    # Link user to doctor doc without triggering another save loop
    frappe.db.set_value("Doctor", doc.name, "user_id", user.name)
