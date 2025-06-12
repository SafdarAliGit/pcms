import frappe
import re

def sanitize_station(station_name):
    """Sanitize station name consistently"""
    return re.sub(r"[-\s]", "", station_name).lower()

def notify_new_message(doc, method):
    # Use consistent naming pattern
    room = f"nursing_message:{sanitize_station(doc.nursing_station)}"
    
    frappe.publish_realtime(
        event=room,  # Consistent event name
        message={
            "message_content": doc.message_content,
            "sender": doc.sender,
            "sender_name": doc.sender_name,
            "room_no": doc.room_no,
            "status": doc.status,
            "sent_time": doc.sent_time,
            "audio": doc.audio
        }
    )