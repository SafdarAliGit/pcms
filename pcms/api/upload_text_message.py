import frappe
from frappe import _
from frappe.utils import format_datetime

@frappe.whitelist()
def upload_text_message(message_content=None):
    if message_content is None:
        frappe.throw(_("No text provided"))
   

    try:
        # Get Patient Info
        patient = frappe.db.get_value("Patient", {"user_id": frappe.session.user}, [
            "name", "patient_name", "mr_no", "nursing_station",
            "health_care_unit", "hospital", "room_no"
        ], as_dict=True)

        # Save to Message Doctype
        message = frappe.new_doc("Message")
        message.sender = patient.get("name")
        message.sender_name = patient.get("patient_name")
        message.nursing_station = patient.get("nursing_station")
        message.health_care_unit = patient.get("health_care_unit")
        message.hospital = patient.get("hospital")
        message.message_content = message_content if message_content else "No Message Found"
        message.sent_time = frappe.utils.now_datetime()
        message.room_no = patient.get("room_no", "")
        message.status = "New"
        message.save()
              

        return {
            "message_content": message_content,
            "sent_time":format_datetime(message.sent_time, "dd-MM-yyyy hh:mm a"),
            "status": message.status
        }

    except Exception as e:
        frappe.log_error("Text Message Error", str(e))
        return str(e)


        
