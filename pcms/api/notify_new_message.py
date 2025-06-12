import frappe
import re

def sanitize_station(station_name):
    # Replace non-alphanumeric characters with underscores, collapse duplicates
    s = re.sub(r'\W+', '_', station_name).strip('_').lower()
    return s

def notify_new_message(doc, method):
    station = sanitize_station(doc.nursing_station)
    frappe.publish_realtime("new_message", {
            "message_content": doc.message_content,
            "sender": doc.sender,
            "sender_name": doc.sender_name,
            "room_no": doc.room_no,
            "status": doc.status,
            "sent_time": doc.sent_time,
            "audio": doc.audio
        },room=f"SZH-Radiology-NS3")
    
    
        
