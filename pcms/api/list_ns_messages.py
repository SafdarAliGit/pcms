import frappe
from frappe.utils.data import format_datetime

@frappe.whitelist()
def list_ns_messages():
    """Fetch messages linked to the current user's nursing station."""
    settings = frappe.get_single("App Settings")
    if not settings:
        frappe.throw("App Settings not found")
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

    # Fetch messages for this nursing station with formatted datetime
    messages = frappe.db.sql(f"""
        SELECT 
            message_content, sender, sender_name, 
            room_no, 
            DATE_FORMAT(sent_time, '%%d-%%m-%%Y %%h:%%i %%p') as sent_time,
            status, audio, symptoms_audio, name
        FROM `tabMessage`
        WHERE nursing_station = %(nursing_station)s
        ORDER BY creation DESC
        LIMIT %(limit)s
    """, {
        "nursing_station": nursing_station,
        "limit": settings.display_received_messages
    }, as_dict=True)

    # Reverse the list to show latest at bottom
    messages.reverse()

    return messages