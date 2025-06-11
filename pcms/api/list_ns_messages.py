import frappe

@frappe.whitelist()
def list_ns_messages():
    # Get patient using the current logged-in user's ID
    nursing_station = frappe.db.get_value(
        "Nursing Station", 
        {"user_id": frappe.session.user}, 
        ["name"], 
        as_dict=True
    )

    if not nurse:
        frappe.throw("No patient found for this user.")

    # Fetch messages sent by this patient (using mr_no as sender)
    messages = frappe.db.get_all(
        "Message",
        filters={"nursing_station": nursing_station.name},
        fields=["message_content", "sender","sender_name","room_no","sent_time","status","audio"],order_by="creation asc"
    )

    return messages  # Return list (can be empty)

       

    
