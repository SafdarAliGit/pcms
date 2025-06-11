import frappe

@frappe.whitelist()
def list_ns_messages():
    # Get nursing station based on the current logged-in user's ID
    nursing_station = frappe.db.get_value(
        "Nursing Station", 
        {"user_id": frappe.session.user}, 
        ["name"], 
        as_dict=True
    )

    if not nursing_station:
        frappe.throw("No nursing station found for this user.")

    # Fetch messages linked to this nursing station
    messages = frappe.db.get_all(
        "Message",
        filters={"nursing_station": nursing_station.name},
        fields=[
            "message_content", "sender", "sender_name", 
            "room_no", "sent_time", "status", "audio"
        ],
        order_by="creation asc"
    )

    return messages  # Always returns a list, can be empty
