// Copyright (c) 2025, Safdar Ali and contributors
// For license information, please see license.txt

frappe.ui.form.on("Hospital", {
	refresh(frm) {

	},
    hospital_name(frm) {
        if (frm.doc.hospital_name) {
            // Generate abbreviation from hospital_name
            const abbreviation = frm.doc.hospital_name
                .split(' ')
                .map(word => word[0]?.toUpperCase())
                .join('');

            // Set the abbreviation field
            frm.set_value('abbreviation', abbreviation);
        }
    }
});
