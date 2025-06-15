# import frappe
# from frappe import _

# def get_context(context):
#     context.no_cache = 1
#     user = frappe.session.user or ""
#     context.station = ""

#     if user != "Guest" and user:
#         try:
#             station = frappe.db.get_value("Nursing Station", {"user_id": user}, "name")
#             context.station = station or ""
#         except Exception as e:
#             frappe.log_error(frappe.get_traceback(), _("Error fetching Nursing Station for user {0}").format(user))
#             context.station = ""

#     return context
