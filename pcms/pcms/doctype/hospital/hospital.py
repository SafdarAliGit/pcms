# Copyright (c) 2025, Safdar Ali and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Hospital(Document):
	def before_save(self):
		if self.hospital_name and not self.abbreviation:
			# Create abbreviation from hospital_name
			self.abbreviation = ''.join(
				word[0].upper() for word in self.hospital_name.split() if word
			)
        
	 
