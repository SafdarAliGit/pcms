import frappe
from frappe.utils.data import format_datetime

@frappe.whitelist()
def list_chat_messages():
    # Get patient using the current logged-in user's ID
    settings = frappe.get_single("App Settings")
    if not settings:
        frappe.throw("App Settings not found")
    patient = frappe.db.get_value(
        "Patient", 
        {"user_id": frappe.session.user}, 
        ["mr_no"], 
        as_dict=True
    )

    if not patient:
        frappe.throw("No patient found for this user.")

    # Fetch messages with formatted datetime
    messages = frappe.db.sql(f"""
        SELECT 
            audio, 
            message_content, 
            DATE_FORMAT(sent_time, '%%d-%%m-%%Y %%h:%%i %%p') as sent_time,
            status, 
            name
        FROM `tabMessage`
        WHERE sender = %(mr_no)s
        ORDER BY creation DESC
        LIMIT %(limit)s
    """, {
        "mr_no": patient.mr_no,
        "limit": settings.display_sent_messages
    }, as_dict=True)

    # Reverse the list to show latest at bottom
    messages.reverse()

    return messages