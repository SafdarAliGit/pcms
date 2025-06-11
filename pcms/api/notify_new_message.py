import frappe

def notify_new_message(doc, method):
    # Get the nursing station of the currently logged-in user
    user_nursing_station = frappe.db.get_value(
        "Patient", 
        {"user_id": frappe.session.user}, 
        "nursing_station",
        as_dict=True
    )

    # Send message only if the message's nursing station matches the logged-in user's
    if doc.nursing_station == user_nursing_station.nursing_station:
        frappe.publish_realtime("new_message", {
            "message_content": doc.message_content,
            "sender": doc.sender,
            "sender_name": doc.sender_name,
            "room_no": doc.room_no,
            "status": doc.status,
            "sent_time": doc.sent_time,
            "audio": doc.audio
        }, user=frappe.session.user)
