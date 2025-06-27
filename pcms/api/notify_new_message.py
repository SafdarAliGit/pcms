import frappe
import re

def sanitize_station(station_name):
    s = re.sub(r"[-\s]", "", station_name).lower()
    return s

def notify_new_message(doc, method):
    if not doc.get("__islocal"):
        station = sanitize_station(doc.nursing_station)
        frappe.publish_realtime(station, {
            "message_content": doc.message_content,
            "sender": doc.sender,
            "sender_name": doc.sender_name,
            "room_no": doc.room_no,
            "status": doc.status,
            "sent_time": doc.sent_time,
            "audio": doc.audio,
            "symptoms_audio":doc.symptoms_audio,
            "name": doc.name
        }
        )

    
        
