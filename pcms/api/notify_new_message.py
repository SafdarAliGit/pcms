# in your_app/api/messaging.py
import frappe
def notify_new_message(doc, method):
    frappe.throw("New Message")
    frappe.publish_realtime("new_message", {
        "message": doc.message_content,
        "sender": doc.owner
    })
