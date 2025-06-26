import frappe
from frappe.utils.data import format_datetime

@frappe.whitelist()
def list_ns_messages():
    """Fetch messages linked to the current user's nursing station."""
    user = frappe.session.user
    nursing_station_name = None

    # Attempt to fetch nursing station from 'Nursing Station' doctype
    nursing_station = frappe.db.get_value(
        "Nursing Station",
        {"user_id": user},
        "name"
    )

    # If not found, try from 'Nurse' doctype
    if not nursing_station:
        nursing_station = frappe.db.get_value(
            "Nurse",
            {"user_id": user},
            "nursing_station"
        )

    if not nursing_station:
        frappe.throw("No nursing station found for this user.")

    # Fetch messages for this nursing station
    messages = frappe.db.get_all(
        "Message",
        filters={"nursing_station": nursing_station},
        fields=[
            "message_content", "sender", "sender_name", 
            "room_no", "sent_time", "status", "audio","symptoms_audio", "name"
        ],
        order_by="creation asc"
    )

    # Format datetime for each message
    for m in messages:
        m["sent_time"] = format_datetime(m["sent_time"], "dd-MM-yyyy hh:mm a")

    return messages
