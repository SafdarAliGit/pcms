# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import re

class Message(Document):
		pass	
	# def sanitize_station(self,station_name):
	# 	s = re.sub(r"[-\s]", "", station_name).lower()
	# 	return s
	
	# def on_update(self):
	# 	if not self.get("__islocal"):
	# 		station = self.sanitize_station(self.nursing_station)
	# 		frappe.publish_realtime(station, {
	# 			"message_content": self.message_content,
	# 			"sender": self.sender,
	# 			"sender_name": self.sender_name,
	# 			"room_no": self.room_no,
	# 			"status": self.status,
	# 			"sent_time": self.sent_time,
	# 			"audio": self.audio,
	# 			"symptoms_audio":self.symptoms_audio,
	# 			"name": self.name
	# 		}
	# 		)

		