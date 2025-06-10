import frappe

def ensure_folder_path(path, root="Home"):
    """
    Ensure a folder path exists in File Doctype.
    Returns the name of the final folder.
    """
    parts = path.strip("/").split("/")
    current_parent = root

    for folder_name in parts:
        # Check if this folder exists under the current parent
        existing_folder = frappe.db.exists("File", {
            "file_name": folder_name,
            "is_folder": 1,
            "folder": current_parent
        })

        if existing_folder:
            current_parent = existing_folder
        else:
            # Create the folder
            folder = frappe.get_doc({
                "doctype": "File",
                "file_name": folder_name,
                "is_folder": 1,
                "folder": current_parent
            }).insert(ignore_permissions=True)
            current_parent = folder.name

    return current_parent
