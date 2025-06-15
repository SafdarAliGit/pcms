// Copyright (c) 2025, Safdar Ali and contributors
// For license information, please see license.txt

frappe.ui.form.on("Nurse", {
	refresh(frm) {
        frm.set_query("health_care_unit", function () {
            return {
                filters: {
                    "is_active": 1,
                    "hospital": frm.doc.hospital
                }
            };
        });
        frm.set_query("nursing_station", function () {
            return {
                filters: {
                    "is_active": 1,
                    "health_care_unit": frm.doc.health_care_unit
                }
            };
        });
	},
    
});
