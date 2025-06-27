import os, wave, json
from vosk import Model, KaldiRecognizer
import frappe
from frappe import _

def safe_transcribe(converted_path):
    """Transcribes WAV audio using Vosk safely; returns string text."""
    text = ""
    try:
        model_path = os.path.join(frappe.get_app_path('pcms'), 'model')
        if not os.path.exists(model_path):
            frappe.throw(_("Vosk model not found at: {0}").format(model_path))

        model = Model(model_path)
        recognizer = KaldiRecognizer(model, 16000)

        with wave.open(converted_path, 'rb') as wf:
            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                try:
                    recognizer.AcceptWaveform(data)
                except Exception as e:
                    frappe.log_error(f"Vosk accept error: {e}")

        raw = recognizer.FinalResult()
        try:
            result = json.loads(raw)
            text = result.get("text", "")
        except (json.JSONDecodeError, ValueError) as e:
            frappe.log_error(f"Malformed JSON from Vosk: {e}\nRaw: {raw}")
            text = ""
    except Exception as e:
        frappe.log_error("Transcription failed", str(e))
        text = ""
    return text
