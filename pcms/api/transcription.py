# import base64
# import os
# import tempfile
# import wave
# import json
# from vosk import Model, KaldiRecognizer
# import frappe

# @frappe.whitelist()
# def transcribe_audio(audio_data):
#     temp_path = None
#     try:
#         if not audio_data:
#             return {"text": "Error: No audio data provided."}

#         # 1. Extract base64 data
#         try:
#             header, encoded = audio_data.split(',') if ',' in audio_data else ('', audio_data)
#             audio_bytes = base64.b64decode(encoded)
#         except Exception as e:
#             return {"text": f"Error: Invalid audio data format - {str(e)}"}

#         # 2. Save to temp file
#         _, temp_path = tempfile.mkstemp(suffix='.wav')
#         with open(temp_path, 'wb') as f:
#             f.write(audio_bytes)

#         # 3. Validate WAV format
#         try:
#             with wave.open(temp_path, 'rb') as wf:
#                 if wf.getcomptype() != 'NONE':
#                     return {"text": "Error: Audio must be uncompressed PCM WAV format"}
                
#                 # Check audio parameters
#                 channels = wf.getnchannels()
#                 sample_width = wf.getsampwidth()
#                 frame_rate = wf.getframerate()
                
#                 # Log audio file details for debugging
#                 frappe.logger().debug(f"Audio details: channels={channels}, width={sample_width}, rate={frame_rate}")
                
#                 if channels != 1 or sample_width != 2 or frame_rate != 16000:
#                     return {"text": f"Error: Audio must be mono (1 channel), 16-bit (2 bytes), 16kHz. Got: {channels} channels, {sample_width*8}-bit, {frame_rate}Hz"}
#         except wave.Error as e:
#             return {"text": f"Error: Invalid WAV file - {str(e)}"}
#         except Exception as e:
#             frappe.log_error("Transcription WAV validation error", str(e))
#             return {"text": f"Error: Failed to validate audio file - {str(e)}"}

#         # 4. Load model
#         model_path = os.path.join(frappe.get_app_path('pcms'), 'model')
#         if not os.path.exists(model_path):
#             return {"text": "Error: Model path does not exist."}

#         model = Model(model_path)

#         # 3. Open and validate WAV file
#         with wave.open(temp_path, 'rb') as wf:
#             if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
#                 return {"text": "Error: Audio must be WAV format, Mono, 16-bit, 16kHz"}

#             recognizer = KaldiRecognizer(model, 16000)
#             while True:
#                 data = wf.readframes(4000)
#                 if len(data) == 0:
#                     break
#                 recognizer.AcceptWaveform(data)

#         result = json.loads(recognizer.FinalResult())

#         message = frappe.new_doc("Message")
#         message.message_content = result.get("text", "")
#         message.save()

#         return {"text": result.get("text", "")}

#     except Exception as e:
#         frappe.log_error(title="Transcription Error", message=str(e))
#         return {"text": f"Error: {str(e)}"}

#     finally:
#         if temp_path and os.path.exists(temp_path):
#             os.remove(temp_path)


# import frappe
# from frappe.utils.file_manager import save_file
# from frappe import _

# @frappe.whitelist()
# def upload_voice_file():
#     from werkzeug.datastructures import FileStorage
#     filedata = frappe.request.files.get('file')

#     if not filedata:
#         frappe.throw(_("No file uploaded"))

#     saved_file = save_file(
#         fname=filedata.filename,
#         content=filedata.stream.read(),
#         dt=None,  # or attach to a doctype, e.g. 'Chat Message'
#         dn=None,
#         folder="",
#         is_private=1
#     )

#     return {
#         "file_name": saved_file.file_name,
#         "file_url": saved_file.file_url,
#         "is_private": saved_file.is_private,
#         "size": saved_file.file_size,
#         "doctype": saved_file.attached_to_doctype,
#         "docname": saved_file.attached_to_name
#     }


import frappe
from frappe.utils.file_manager import save_file
from frappe import _
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment
import os
import tempfile
import wave
import json

@frappe.whitelist()
def upload_voice_file():
    filedata = frappe.request.files.get('file')
    if not filedata:
        frappe.throw(_("No file uploaded"))

    # Save the original file
    saved_file = save_file(
        fname=filedata.filename,
        content=filedata.stream.read(),
        dt=None,
        dn=None,
        folder="",
        is_private=1
    )

    # Save original content to temp file
    original_path = tempfile.mktemp(suffix=os.path.splitext(saved_file.file_name)[-1])
    with open(original_path, 'wb') as f:
        f.write(saved_file.get_content())

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

        # Save to Message doctype
        message = frappe.new_doc("Message")
        message.message_content = text if text else "Still Text Not Found"
        message.save()

        return {
            "file_name": saved_file.file_name,
            "file_url": saved_file.file_url,
            "is_private": saved_file.is_private,
            "size": saved_file.file_size,
            "transcription": text
        }

    except Exception as e:
        frappe.log_error("Transcription error", str(e))
        return {"error": str(e)}

    finally:
        # Cleanup temp files
        for path in [original_path, converted_path]:
            if path and os.path.exists(path):
                os.remove(path)
