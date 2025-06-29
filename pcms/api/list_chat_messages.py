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

    # Fetch messages sent by this patient (using mr_no as sender)
    messages = frappe.db.get_all(
        "Message",
        filters={"sender": patient.mr_no},
        fields=["audio", "message_content", "sent_time", "status", "name"],
        order_by="creation desc",
        limit=settings.display_sent_messages
    )

    # for m in messages:
    #     m["sent_time"] = format_datetime(m["sent_time"], "dd-MM-yyyy hh:mm a")
    return messages

       

    
