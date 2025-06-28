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

# ============================= implemented threading =============================
import frappe
from frappe.utils.file_manager import save_file
from frappe import _
from pydub import AudioSegment
import os
import tempfile
import concurrent.futures
import re
import time
import traceback
from pcms.utils.ensure_folder_path import ensure_folder_path
from frappe.utils.data import format_datetime
from pcms.api.extract_symptoms import SymptomExtractor
from gtts import gTTS
import language_tool_python
from pcms.api.transcribe_wave import safe_transcribe

class VoiceProcessor:
    _instance = None
    TEMP_DIR = "/tmp/voice_processor"
    
    def __init__(self):
        if not VoiceProcessor._instance:
            VoiceProcessor._instance = self
            os.makedirs(self.TEMP_DIR, exist_ok=True)
            self._init_resources()
    
    @classmethod
    def get_instance(cls):
        if not cls._instance:
            cls._instance = VoiceProcessor()
        return cls._instance
    
    def _init_resources(self):
        """Pre-load heavy resources at startup"""
        csv_path = os.path.join(os.path.dirname(__file__), 'final_symptoms.csv')
        self.extractor = SymptomExtractor(csv_path)
        self.spell_checker = language_tool_python.LanguageTool('en-US')

    def _process_audio(self, filedata, input_path, output_path):
        """Optimized audio conversion"""
        try:
            with open(input_path, 'wb') as f:
                f.write(filedata)
            
            (AudioSegment.from_file(input_path)
                .set_channels(1)
                .set_frame_rate(16000)
                .set_sample_width(2)
                .export(output_path, format="wav", codec="pcm_s16le", bitrate="128k"))
            return True
        except Exception as e:
            frappe.log_error("Audio Processing Failed", f"{str(e)}\n{traceback.format_exc()}")
            return False

    def _generate_tts(self, text, output_path):
        """Fast TTS generation"""
        try:
            tts = gTTS(text=text, lang='en', tld='com', slow=False)
            tts.save(output_path)
            return True
        except Exception as e:
            frappe.log_error("TTS Generation Failed", f"{str(e)}\n{traceback.format_exc()}")
            return False

    @frappe.whitelist()
    def upload_voice_file(self, filedata=None, filename=None, text_msg=None):
        """Main processing flow"""
        file_paths = {
            'original': None,
            'converted': None,
            'mp3': None
        }
        
        try:
            # Get request data properly
            if not filedata and hasattr(frappe.local, 'request'):
                request = frappe.local.request
                if request.method == 'POST':
                    if 'file' in request.files:
                        filedata = request.files['file'].read()
                        filename = request.files['file'].filename
                    text_msg = request.form.get('text_msg', text_msg)
            
            if not filedata:
                frappe.throw(_("No file uploaded"))

            # File size check
            max_size_kb = frappe.db.get_single_value("App Settings", "max_audio_size") or 1024
            file_size = len(filedata)
            
            if file_size > max_size_kb * 1024:
                frappe.throw(_(f"File size exceeds maximum allowed ({max_size_kb} KB). Uploaded: {file_size / 1024:.2f} KB"))

            # Create temp files
            file_ext = os.path.splitext(filename)[-1] if filename else '.tmp'
            file_paths['original'] = tempfile.mktemp(dir=self.TEMP_DIR, suffix=file_ext)
            file_paths['converted'] = tempfile.mktemp(dir=self.TEMP_DIR, suffix=".wav")
            file_paths['mp3'] = tempfile.mktemp(dir=self.TEMP_DIR, suffix=".mp3")

            # Parallel processing
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                # Audio + Patient data in parallel
                audio_future = executor.submit(self._process_audio, filedata, file_paths['original'], file_paths['converted'])
                patient_future = executor.submit(
                    frappe.db.get_value,
                    "Patient",
                    {"user_id": frappe.session.user},
                    ["name", "patient_name", "mr_no", "nursing_station", "health_care_unit", "hospital", "room_no"],
                    as_dict=True
                )

                if not audio_future.result():
                    raise Exception("Audio processing failed")
                
                patient = patient_future.result()

                # Core processing
                text = text_msg if text_msg else safe_transcribe(file_paths['converted'])
                spell_checked_text = self.spell_checker.correct(text)
                symptoms = self.extractor.get_patient_symptoms(spell_checked_text)

                # Parallel final steps
                tts_future = executor.submit(self._generate_tts, symptoms, file_paths['mp3'])
                
                message = frappe.new_doc("Message")
                message.update({
                    "sender": patient.get("name"),
                    "sender_name": patient.get("patient_name"),
                    "nursing_station": patient.get("nursing_station"),
                    "health_care_unit": patient.get("health_care_unit"),
                    "hospital": patient.get("hospital"),
                    "message_content": spell_checked_text or "No Message Found",
                    "sent_time": frappe.utils.now_datetime(),
                    "room_no": patient.get("room_no", ""),
                    "status": "New",
                    "symptoms": symptoms
                })
                message.insert(ignore_permissions=True, ignore_mandatory=True)
                
                if not tts_future.result():
                    raise Exception("TTS generation failed")
                
                self._save_attachments(message, file_paths['converted'], file_paths['mp3'], patient)
                self._send_realtime_update(message)

                return {
                    "file_name": os.path.basename(message.audio),
                    "file_url": message.audio,
                    "symptoms_audio_name": os.path.basename(message.symptoms_audio),
                    "symptoms_audio_url": message.symptoms_audio,
                    "is_private": 1,
                    "size": file_size,
                    "transcription": spell_checked_text,
                    "sent_time": format_datetime(message.sent_time, "dd-MM-yyyy hh:mm a"),
                    "status": message.status
                }

        except Exception as e:
            frappe.log_error("Voice Processing Error", f"{str(e)}\n{traceback.format_exc()}")
            return {"error": str(e), "type": type(e).__name__}
        
        finally:
            self._cleanup_files(file_paths.values())

    def _save_attachments(self, message, wav_path, mp3_path, patient):
        """Save attachments efficiently"""
        folder = ensure_folder_path(
            f"{patient.get('hospital', 'unknown')}/"
            f"{patient.get('health_care_unit', 'unknown')}/"
            f"{patient.get('nursing_station', 'unknown')}"
        )
        
        attachments = [
            (wav_path, "audio"),
            (mp3_path, "symptoms_audio")
        ]
        
        for path, field in attachments:
            if not os.path.exists(path):
                raise FileNotFoundError(f"File not found: {path}")
            
            with open(path, 'rb') as f:
                file_url = save_file(
                    fname=os.path.basename(path),
                    content=f.read(),
                    dt="Message",
                    dn=message.name,
                    folder=folder,
                    is_private=1
                ).file_url
                setattr(message, field, file_url)
        
        message.save()

    def _send_realtime_update(self, message):
        """Send realtime update"""
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
            frappe.log_error("Realtime Update Failed", f"{str(e)}\n{traceback.format_exc()}")

    def _cleanup_files(self, paths):
        """Clean up temp files"""
        for path in paths:
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                frappe.log_error(f"File Cleanup Failed: {path}", str(e))

# Public endpoint
@frappe.whitelist()
def upload_voice_file():
    return VoiceProcessor.get_instance().upload_voice_file()