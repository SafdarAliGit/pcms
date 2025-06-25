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
from frappe.utils.data import format_datetime
from pcms.api.extract_symptoms import extract_and_format
from gtts import gTTS

@frappe.whitelist()
def upload_voice_file():
    filedata = frappe.request.files.get('file')
    # text_msg = frappe.request.form.get('text_msg', '')
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
        if not text_msg:
            with wave.open(converted_path, 'rb') as wf:
                while True:
                    data = wf.readframes(4000)
                    if len(data) == 0:
                        break
                    recognizer.AcceptWaveform(data)

            result = json.loads(recognizer.FinalResult())
            text = result.get("text", "")
        else:
            text = text_msg

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
        message.message_content = text if text else "No Message Found"
        message.sent_time = frappe.utils.now_datetime()
        message.room_no = patient.get("room_no", "")
        message.status = "New"
        # Extract symptoms
        symptoms = extract_and_format(text)
        message.symptoms = symptoms
        message.save()

        # Generate MP3 from symptoms text
        tts = gTTS(symptoms)

        # Save converted WAV file and attach to message.audio
        folder_path = f"{patient.get('hospital', 'unknown')}/{patient.get('health_care_unit', 'unknown')}/{patient.get('nursing_station', 'unknown')}"
        folder = ensure_folder_path(folder_path)

        with open(converted_path, 'rb') as wav_file:
            wav_content = wav_file.read()
            wav_filename = os.path.basename(converted_path)
            attached_file = save_file(
                fname=wav_filename,
                content=wav_content,
                dt="Message",
                dn=message.name,
                folder=folder,
                is_private=1
            )
            message.audio = attached_file.file_url
            message.save()
        
        # Save generated MP3 file ---
        mp3_path = tempfile.mktemp(suffix=".mp3")
        tts.save(mp3_path)

        with open(mp3_path, "rb") as mp3_f:
            mp3_content = mp3_f.read()
        attached_mp3 = save_file(
            fname=os.path.basename(mp3_path),
            content=mp3_content,
            dt="Message",
            dn=message.name,
            folder=folder,
            is_private=1
        )
        message.symptoms_audio = attached_mp3.file_url
        message.save()
        

        return {
            "file_name": attached_file.file_name,
            "file_url": attached_file.file_url,
            "symptoms_audio_name": attached_mp3.file_name,
            "symptoms_audio_url": attached_mp3.file_url,
            "is_private": attached_file.is_private,
            "size": attached_file.file_size,
            "transcription": text,
            "sent_time": format_datetime(message.sent_time, "dd-MM-yyyy hh:mm a"),
            "status": message.status
        }

    except Exception as e:
        frappe.log_error("Transcription error", str(e))
        return {"error": str(e)}

    finally:
        for path in [original_path, converted_path]:
            try:
                os.remove(path)
            except FileNotFoundError:
                pass  # file was never created or already deleted

        # Safely delete the mp3 file if it exists
        try:
            os.remove(mp3_path)
        except (UnboundLocalError, FileNotFoundError):
            pass  # mp3_path wasn't created or already removed

