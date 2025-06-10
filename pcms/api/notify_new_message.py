# import frappe
# from frappe.utils import get_datetime, format_datetime
# import pytz

# def notify_new_message(doc, method):
#     # Convert to Asia/Riyadh timezone
#     saudi_tz = pytz.timezone("Asia/Riyadh")
#     sent_time_dt = get_datetime(doc.sent_time).astimezone(saudi_tz)
    
#     # Format: dd-mm-yyyy hh:mm AM/PM
#     formatted_time = sent_time_dt.strftime("%d-%m-%Y %I:%M %p")

#     frappe.publish_realtime("new_message", {
#         "message_content": doc.message_content,
#         "sender": doc.sender,
#         "sender_name": doc.sender_name,
#         "room_no": doc.room_no,
#         "status": doc.status,
#         "sent_time": formatted_time
#     })


# in your_app/api/messaging.py
import frappe
def notify_new_message(doc, method):
    frappe.publish_realtime("new_message", {
        "message_content": doc.message_content,
        "sender": doc.sender,
        "sender_name": doc.sender_name,
        "room_no": doc.room_no,
        "status": doc.status,
        "sent_time": doc.sent_time,
        "audio": doc.audio
    })
