import frappe
from frappe.utils.file_manager import save_file
from frappe import _
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment
import os
import tempfile
import wave
import json
from pcms.utils.ensure_folder_path import ensure_folder_path

@frappe.whitelist()
def upload_voice_file():
    filedata = frappe.request.files.get('file')
    if not filedata:
        frappe.throw(_("No file uploaded"))

    # Save original uploaded file to temp path
    original_path = tempfile.mktemp(suffix=os.path.splitext(filedata.filename)[-1])
    with open(original_path, 'wb') as f:
        f.write(filedata.stream.read())

    # Convert to 16kHz Mono WAV PCM format
    converted_path = tempfile.mktemp(suffix=".wav")
    try:
        audio = AudioSegment.from_file(original_path)
        audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
        audio.export(converted_path, format="wav")

        # Load Vosk model
        model_path = os.path.join(frappe.get_app_path('pcms'), 'model')
        if not os.path.exists(model_path):
            frappe.throw(_("Vosk model not found at: {0}").format(model_path))

        model = Model(model_path)
        recognizer = KaldiRecognizer(model, 16000)

        # Transcribe audio
        with wave.open(converted_path, 'rb') as wf:
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                recognizer.AcceptWaveform(data)

        result = json.loads(recognizer.FinalResult())
        text = result.get("text", "")

        # Get Patient Info
        patient = frappe.db.get_value("Patient", {"user_id": frappe.session.user}, [
            "name", "patient_name", "mr_no", "nursing_station",
            "health_care_unit", "hospital", "room_no"
        ], as_dict=True)

        # Prepare folder path for file
        folder_path = f"{patient.get('hospital', 'unknown')}/{patient.get('health_care_unit', 'unknown')}/{patient.get('nursing_station', 'unknown')}"
        folder = ensure_folder_path(folder_path)

        # Read and prepare file content
        with open(converted_path, 'rb') as wav_file:
            wav_content = wav_file.read()
            wav_filename = os.path.basename(converted_path)

        # Create file attachment (do not attach to document yet)
        attached_file = save_file(
            fname=wav_filename,
            content=wav_content,
            dt="Message",     # We'll attach it logically by linking to the new doc name
            dn=None,          # Will update after Message is saved
            folder=folder,
            is_private=1
        )

        # Create and save the Message document (insert once)
        message = frappe.get_doc({
            "doctype": "Message",
            "sender": patient.get("name"),
            "sender_name": patient.get("patient_name"),
            "nursing_station": patient.get("nursing_station"),
            "health_care_unit": patient.get("health_care_unit"),
            "hospital": patient.get("hospital"),
            "message_content": text if text else "No Message Found",
            "sent_time": frappe.utils.now_datetime(),
            "room_no": patient.get("room_no", ""),
            "status": "New",
            "audio": attached_file.file_url  # Attach file URL before insert
        })
        message.insert(ignore_permissions=True)  # Save once

        # Update the File document to link it to the newly created Message
        frappe.db.set_value("File", attached_file.name, {
            "attached_to_name": message.name
        })

        # Return info
        return {
            "file_name": attached_file.file_name,
            "file_url": attached_file.file_url,
            "is_private": attached_file.is_private,
            "size": attached_file.file_size,
            "transcription": text
        }


    except Exception as e:
        frappe.log_error("Transcription error", str(e))
        return {"error": str(e)}

    finally:
        for path in [original_path, converted_path]:
            if path and os.path.exists(path):
                os.remove(path)
