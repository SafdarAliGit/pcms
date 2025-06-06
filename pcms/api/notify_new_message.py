# in your_app/api/messaging.py
import frappe
def notify_new_message(doc, method):
    frappe.publish_realtime("new_message", {
        "message_content": doc.message_content,
        "sender": doc.mr_no,
        "sender_name": doc.sender_name,
        "room_no": doc.room_no,
        "status": doc.status,
        "sent_time": doc.sent_time
    })
