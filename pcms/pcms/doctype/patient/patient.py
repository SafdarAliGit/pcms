# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

import frappe
from datetime import datetime
from frappe.model.document import Document
from frappe.utils.password import update_password


class Patient(Document):
	pass

def create_patient_user(doc, method):
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
            "first_name": doc.patient_name,
            "send_welcome_email": 0,
            "roles": [{"role": "Patient"}],
            "user_type": "System User"
        })
        user.insert(ignore_permissions=True)
        update_password(doc.email, doc.mr_no)  # or doc.mr_number

    # Link user to doctor doc without triggering another save loop
    frappe.db.set_value("Patient", doc.name, "user_id", user.name)


def generate_mr_no(doc, method):
    # Get the current year and its last two digits
    current_year = datetime.now().year
    year_suffix = str(current_year)[-2:]

    # Get the abbreviation from the linked Hospital
    if not doc.hospital:
        frappe.throw("Hospital is required to generate MR No")

    hospital_abbr = frappe.get_value('Hospital', doc.hospital, 'abbreviation')
    if not hospital_abbr:
        frappe.throw(f"Abbreviation not found for Hospital: {doc.hospital}")

    # Generate the new MR number
    last_mr_no = frappe.db.get_value(
        'Patient',
        {'mr_no': ['like', f'{hospital_abbr}-%-{year_suffix}']},
        'mr_no',
        order_by='creation desc'
    )

    if last_mr_no:
        last_number = int(last_mr_no.split('-')[1])
        new_number = last_number + 1
    else:
        new_number = 1

    mr_no = f"{hospital_abbr}-{new_number:05d}-{year_suffix}"
    doc.mr_no = mr_no