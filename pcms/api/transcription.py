# import frappe
# from frappe.utils.file_manager import save_file
# from frappe import _
# from pydub import AudioSegment
# import os
# import tempfile
# from pcms.utils.ensure_folder_path import ensure_folder_path
# from frappe.utils.data import format_datetime
# from pcms.api.extract_symptoms import SymptomExtractor
# from gtts import gTTS
# import language_tool_python
# import re
# from pcms.api.transcribe_wave import safe_transcribe

# @frappe.whitelist()
# def upload_voice_file():
#     max_size_kb = frappe.db.get_single_value("App Settings", "max_audio_size") or 1024
#     max_size_bytes = max_size_kb * 1024  # Convert KB to bytes
#     csv_path = os.path.join(os.path.dirname(__file__), 'final_symptoms.csv')
#     extractor = SymptomExtractor(csv_path)
#     spell_checker = language_tool_python.LanguageTool('en-US')
#     filedata = frappe.request.files.get('file')
#     text_msg = frappe.request.form.get('text_msg', '')
#     text = ""
#     if not filedata:
#         frappe.throw(_("No file uploaded"))
    
#     # Check file size before processing
#     file_size = len(filedata.stream.read())
#     filedata.stream.seek(0)  # Reset stream for later use

#     if file_size > max_size_bytes:
#         frappe.throw(_(
#             f"File size exceeds maximum allowed ({max_size_kb} KB). "
#             f"Uploaded: {file_size / 1024:.2f} KB"
#         ))

#     # Save original uploaded file to temp path
#     original_path = tempfile.mktemp(suffix=os.path.splitext(filedata.filename)[-1])
#     with open(original_path, 'wb') as f:
#         f.write(filedata.stream.read())

#     # Convert to 16kHz Mono WAV PCM format
#     converted_path = tempfile.mktemp(suffix=".wav")
#     try:
#         audio = AudioSegment.from_file(original_path)
#         audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
#         audio.export(converted_path, format="wav")

#         # Load Vosk model
#         if not text_msg:
#             text = safe_transcribe(converted_path)
#         else:
#             text = text_msg

#         spell_checked_text = spell_checker.correct(text)
#         # Get Patient Info
#         patient = frappe.db.get_value("Patient", {"user_id": frappe.session.user}, [
#             "name", "patient_name", "mr_no", "nursing_station",
#             "health_care_unit", "hospital", "room_no"
#         ], as_dict=True)

#         # Save to Message Doctype
#         message = frappe.new_doc("Message")
#         message.sender = patient.get("name")
#         message.sender_name = patient.get("patient_name")
#         message.nursing_station = patient.get("nursing_station")
#         message.health_care_unit = patient.get("health_care_unit")
#         message.hospital = patient.get("hospital")
#         message.message_content = spell_checked_text if spell_checked_text else "No Message Found"
#         message.sent_time = frappe.utils.now_datetime()
#         message.room_no = patient.get("room_no", "")
#         message.status = "New"
#         # Extract symptoms
        
#         symptoms = extractor.get_patient_symptoms(spell_checked_text)
#         message.symptoms = symptoms
#         message.insert()

#         # Generate MP3 from symptoms text
#         tts = gTTS(symptoms)

#         # Save converted WAV file and attach to message.audio
#         folder_path = f"{patient.get('hospital', 'unknown')}/{patient.get('health_care_unit', 'unknown')}/{patient.get('nursing_station', 'unknown')}"
#         folder = ensure_folder_path(folder_path)

#         with open(converted_path, 'rb') as wav_file:
#             wav_content = wav_file.read()
#             wav_filename = os.path.basename(converted_path)
#             attached_file = save_file(
#                 fname=wav_filename,
#                 content=wav_content,
#                 dt="Message",
#                 dn=message.name,
#                 folder=folder,
#                 is_private=1
#             )
#             message.audio = attached_file.file_url
#             # message.save()
#         # Save generated MP3 file ---
#         mp3_path = tempfile.mktemp(suffix=".mp3")
#         tts.save(mp3_path)

#         with open(mp3_path, "rb") as mp3_f:
#             mp3_content = mp3_f.read()
#         attached_mp3 = save_file(
#             fname=os.path.basename(mp3_path),
#             content=mp3_content,
#             dt="Message",
#             dn=message.name,
#             folder=folder,
#             is_private=1
#         )
#         message.symptoms_audio = attached_mp3.file_url
#         message.save()

#         # SEND REALTIME MESSAGE
#         def sanitize_station(station_name):
#             s = re.sub(r"[-\s]", "", station_name).lower()
#             return s
#         station = sanitize_station(message.nursing_station)
#         frappe.publish_realtime(station, {
# 				"message_content": message.message_content,
# 				"sender": message.sender,
# 				"sender_name": message.sender_name,
# 				"room_no": message.room_no,
# 				"status": message.status,
# 				"sent_time": message.sent_time,
# 				"audio": message.audio,
# 				"symptoms_audio":message.symptoms_audio,
# 				"name": message.name
# 			}
# 		)
	    	    
#         # END OF REALTIME MESSAGE
#         return {
#             "file_name": attached_file.file_name,
#             "file_url": attached_file.file_url,
#             "symptoms_audio_name": attached_mp3.file_name,
#             "symptoms_audio_url": attached_mp3.file_url,
#             "is_private": attached_file.is_private,
#             "size": attached_file.file_size,
#             "transcription": spell_checked_text,
#             "sent_time": format_datetime(message.sent_time, "dd-MM-yyyy hh:mm a"),
#             "status": message.status
#         }

#     except Exception as e:
#         frappe.log_error("Transcription error", str(e))
#         return {"error": str(e)}

#     finally:
#         # Clean up all temp files
#         for path in [original_path, converted_path, mp3_path]:
#             try:
#                 if path and os.path.exists(path):
#                     os.remove(path)
#             except:
#                 pass


import frappe
from frappe.utils.file_manager import save_file
from frappe import _
from pydub import AudioSegment
import os
import tempfile
import concurrent.futures
import re
from pcms.utils.ensure_folder_path import ensure_folder_path
from frappe.utils.data import format_datetime
from pcms.api.extract_symptoms import SymptomExtractor
from gtts import gTTS
import language_tool_python
from pcms.api.transcribe_wave import safe_transcribe

# Singleton resources
class VoiceProcessorResources:
    _instance = None
    
    def __init__(self):
        if not VoiceProcessorResources._instance:
            VoiceProcessorResources._instance = self
            self.extractor = None
            self.spell_checker = None
            self.vosk_model = None
            self.initialize_resources()
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = VoiceProcessorResources()
        return cls._instance
    
    def initialize_resources(self):
        """Initialize heavy resources once"""
        if not self.extractor:
            csv_path = os.path.join(os.path.dirname(__file__), 'final_symptoms.csv')
            self.extractor = SymptomExtractor(csv_path)
        if not self.spell_checker:
            self.spell_checker = language_tool_python.LanguageTool('en-US')

@frappe.whitelist()
def upload_voice_file():
    resources = VoiceProcessorResources.get_instance()
    original_path = converted_path = mp3_path = None
    
    try:
        # Validate input
        filedata = frappe.request.files.get('file')
        text_msg = frappe.request.form.get('text_msg', '')
        
        if not filedata:
            frappe.throw(_("No file uploaded"))
        
        # File size validation
        max_size_kb = frappe.db.get_single_value("App Settings", "max_audio_size") or 1024
        file_size = len(filedata.stream.read())
        filedata.stream.seek(0)
        
        if file_size > max_size_kb * 1024:
            frappe.throw(_(f"File size exceeds maximum allowed ({max_size_kb} KB). Uploaded: {file_size / 1024:.2f} KB"))

        # Create temp files
        original_path = tempfile.mktemp(suffix=os.path.splitext(filedata.filename)[-1])
        converted_path = tempfile.mktemp(suffix=".wav")
        mp3_path = tempfile.mktemp(suffix=".mp3")

        # Process pipeline
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # Save and convert audio
            executor.submit(
                process_audio, 
                filedata, 
                original_path, 
                converted_path
            ).result()
            
            # Get patient info (ensure database connection)
            patient = executor.submit(get_patient_info).result()
            
            # Ensure database connection is active
            frappe.db.ensure_connection()
            
            # Transcribe and process
            text = text_msg if text_msg else safe_transcribe(converted_path)
            spell_checked_text = resources.spell_checker.correct(text)
            symptoms = resources.extractor.get_patient_symptoms(spell_checked_text)
            
            # Generate TTS
            executor.submit(generate_tts, symptoms, mp3_path).result()
            
            # Create and save message
            message = create_message(patient, spell_checked_text, symptoms)
            save_attachments(message, converted_path, mp3_path, patient)
            
            # Send response
            send_realtime_update(message)
            
            return build_response(message, spell_checked_text)

    except Exception as e:
        frappe.log_error("Voice processing error", str(e))
        return {"error": str(e), "type": type(e).__name__}
    
    finally:
        cleanup_files([original_path, converted_path, mp3_path])

# Database connection decorator
def with_db_connection(func):
    def wrapper(*args, **kwargs):
        frappe.db.ensure_connection()
        try:
            return func(*args, **kwargs)
        finally:
            frappe.db.close()
    return wrapper

@with_db_connection
def get_patient_info():
    """Get patient info with ensured DB connection"""
    return frappe.db.get_value(
        "Patient", 
        {"user_id": frappe.session.user}, 
        ["name", "patient_name", "mr_no", "nursing_station",
         "health_care_unit", "hospital", "room_no"], 
        as_dict=True
    )

def process_audio(filedata, original_path, converted_path):
    """Thread-safe audio processing"""
    with open(original_path, 'wb') as f:
        f.write(filedata.stream.read())
    audio = AudioSegment.from_file(original_path)
    audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
    audio.export(converted_path, format="wav")

def generate_tts(text, output_path):
    """Thread-safe TTS generation"""
    tts = gTTS(text)
    tts.save(output_path)

@with_db_connection
def create_message(patient, text, symptoms):
    """Create message with ensured DB connection"""
    message = frappe.new_doc("Message")
    message.update({
        "sender": patient.get("name"),
        "sender_name": patient.get("patient_name"),
        "nursing_station": patient.get("nursing_station"),
        "health_care_unit": patient.get("health_care_unit"),
        "hospital": patient.get("hospital"),
        "message_content": text or "No Message Found",
        "sent_time": frappe.utils.now_datetime(),
        "room_no": patient.get("room_no", ""),
        "status": "New",
        "symptoms": symptoms
    })
    message.insert(ignore_permissions=True)
    return message

def save_attachments(message, wav_path, mp3_path, patient):
    """Save attachments with DB connection handling"""
    folder_path = f"{patient.get('hospital', 'unknown')}/{patient.get('health_care_unit', 'unknown')}/{patient.get('nursing_station', 'unknown')}"
    folder = ensure_folder_path(folder_path)
    
    with open(wav_path, 'rb') as wav_file, \
         open(mp3_path, 'rb') as mp3_file:
        
        frappe.db.ensure_connection()
        try:
            # Save WAV
            attached_file = save_file(
                fname=os.path.basename(wav_path),
                content=wav_file.read(),
                dt="Message",
                dn=message.name,
                folder=folder,
                is_private=1
            )
            message.audio = attached_file.file_url
            
            # Save MP3
            attached_mp3 = save_file(
                fname=os.path.basename(mp3_path),
                content=mp3_file.read(),
                dt="Message",
                dn=message.name,
                folder=folder,
                is_private=1
            )
            message.symptoms_audio = attached_mp3.file_url
            
            message.save(ignore_permissions=True)
        finally:
            frappe.db.close()

def send_realtime_update(message):
    """Send realtime update with error handling"""
    try:
        station = re.sub(r"[-\s]", "", message.nursing_station).lower()
        frappe.publish_realtime(station, {
            "message_content": message.message_content,
            "sender": message.sender,
            "sender_name": message.sender_name,
            "room_no": message.room_no,
            "status": message.status,
            "sent_time": message.sent_time,
            "audio": message.audio,
            "symptoms_audio": message.symptoms_audio,
            "name": message.name
        })
    except Exception as e:
        frappe.log_error("Realtime update failed", str(e))

def build_response(message, text):
    """Build consistent API response"""
    return {
        "file_name": os.path.basename(message.audio),
        "file_url": message.audio,
        "symptoms_audio_name": os.path.basename(message.symptoms_audio),
        "symptoms_audio_url": message.symptoms_audio,
        "is_private": 1,
        "size": os.path.getsize(message.audio),
        "transcription": text,
        "sent_time": format_datetime(message.sent_time, "dd-MM-yyyy hh:mm a"),
        "status": message.status
    }

def cleanup_files(paths):
    """Safe file cleanup"""
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception as e:
            frappe.log_error(f"Failed to clean up file {path}", str(e))