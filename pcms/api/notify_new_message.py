# in your_app/api/messaging.py
def notify_new_message(doc, method):
    frappe.publish_realtime("new_message", {
        "message": doc.message_content,
        "sender": doc.owner
    })
