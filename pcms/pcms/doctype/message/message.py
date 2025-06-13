# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Message(Document):
	def on_update(self):
		if getattr(self, "_in_insert", False):
			# Skip logic during insert
			return

		# Publish real-time update
		# frappe.publish_realtime(
		# 	self.nursing_station,
		# 	{
		# 		"message_content": self.message_content,
		# 		"sender": self.sender,
		# 		"sender_name": self.sender_name,
		# 		"room_no": self.room_no,
		# 		"status": self.status,
		# 		"sent_time": self.sent_time,
		# 		"audio": self.audio
		# 	}
		# )
			