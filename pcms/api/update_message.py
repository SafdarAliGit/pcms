import frappe
from frappe import _
import re
@frappe.whitelist()
def update_message(name, treatment, status):
    _check_nurse_role()
    msg = frappe.get_doc('Message', name)
    msg.treatment = treatment
    msg.status = status
    msg.attended_by = frappe.session.user
    msg.attended_by_name = frappe.get_value('Nurse', {"user_id": frappe.session.user}, 'nurse_name')
    if not msg.attended_time:
        msg.attended_time = frappe.utils.now()
    msg.save(ignore_permissions=True)
    frappe.db.commit()

    # SEND REALTIME MESSAGE
    def sanitize_station(station_name):
        s = re.sub(r"[-\s]", "", station_name).lower()
        return s
    station = sanitize_station(msg.nursing_station)
    frappe.publish_realtime(station+"_update", {
            "message_content": msg.message_content,
            "sender": msg.sender,
            "sender_name": msg.sender_name,
            "room_no": msg.room_no,
            "status": msg.status,
            "sent_time": msg.sent_time,
            "audio": msg.audio,
            "symptoms_audio":msg.symptoms_audio,
            "name": msg.name
        }
        )
    # END OF REALTIME MESSAGE  
     
    return {'status': status}


def _check_nurse_role():
    if "Nurse" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Only Nurses can perform this action"))
