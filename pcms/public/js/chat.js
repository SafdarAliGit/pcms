window.frappe = window.frappe || {};

frappe.realtime = {
  handlers: {},
  
  on(event, fn) {
    this.handlers[event] = fn;
  },

  init() {
    this.socket = io();
    this.socket.on('message', function (msg) {
      console.log("Socket message:", msg);
    });
    for (let key in this.handlers) {
      this.socket.on(key, this.handlers[key]);
    }
  }
};



frappe.ready(async function () {
  frappe.realtime.init();
  const $chatBody = $("#chat-body");
  const $messageInput = $("#message");
  const $voiceModal = $("#voice-modal");
  const $audioReview = $("#audio-review");

  let SentMessageLimit = 25;
  const r = await frappe.call({
    method: 'pcms.api.app_settings.get_app_settings',
  });
  SentMessageLimit = r.message.display_sent_messages;

  // Load existing messages
  frappe.call({
    method: "pcms.api.list_chat_messages.list_chat_messages",
    callback: r => {
      if (r.message) {
        $chatBody.empty(); 
        r.message.forEach(msg => {
          msg.audio ? uploadVoiceMsg(msg.audio, msg.sent_time, msg.status) : appendMessage(msg.message_content, msg.sent_time, msg.status);
        });
      }
    }
  });

  // 3. Realtime room subscription
  const stationName = window.nursing_station || "";
  const room = stationName.replace(/[-\s]/g, "").toLowerCase();

  frappe.realtime.on(room+"_update", function (data) {
    
    frappe.call({
      method: "pcms.api.list_chat_messages.list_chat_messages",
      callback: r => {
        if (r.message) {
          $chatBody.empty(); 
          r.message.forEach(msg => {
            msg.audio ? uploadVoiceMsg(msg.audio, msg.sent_time, msg.status) : appendMessage(msg.message_content, msg.sent_time, msg.status);
          });
        }
      }
    });

  });

  function scrollToBottom() {
    $chatBody.scrollTop($chatBody[0].scrollHeight);
  }

  

  function appendMessage(text, sent_time, status) {
    if (!text) return;
    const $msg = $("<div>").addClass("chat-message sent" + (status !== "New" ? " status-acknowledged" : "")).text(text);
    const $footer = $("<div>").addClass("voice-footer").appendTo($msg);
    $("<span>").addClass("voice-time").text(sent_time).appendTo($footer);
    $("<span>").addClass((status !== "New" ? "status-acknowledged-text" : "voice-status")).text(status !== "New" ? "Acknowledged \u2713\u2713" : "\u2713").appendTo($footer);
    $chatBody.append($msg);
    // Remove oldest messages if limit exceeded
    const container = $chatBody[0];
    const excess = container.children.length - SentMessageLimit;
    for (let i = 0; i < excess; i++) {
      container.removeChild(container.firstElementChild);
    }
    scrollToBottom();
  }

  $("#send-btn").on("click", () => {
    const text = $messageInput.val().trim();
    if (text) safeUploadTextMessage(text);
  });

  $messageInput.on("keypress", e => {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      $("#send-btn").click();
    }
  });

  // Voice recording logic
  let mediaRecorder, audioChunks = [], audioBlob;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 64000
      });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onerror = e => {
        console.error("Recording error:", e.error);
        alert("Recording failed: " + e.error?.message);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        $audioReview[0].src = url;
        $audioReview[0].load();
        $voiceModal.removeClass("hidden");
        stream.getTracks().forEach(track => track.stop());
      };

      audioChunks = [];
      mediaRecorder.start();
      $("#record-btn").text("⏹️ Stop").addClass("recording").off("click").on("click", stopRecording);
    } catch (err) {
      alert("Microphone access denied or not available.");
      console.error(err);
    }
  }

  function stopRecording() {
    mediaRecorder?.stop();
    $("#record-btn").text("🎤 Record").removeClass("recording").off("click").on("click", startRecording);
  }

  $("#record-btn").on("click", startRecording);

  $("#play-voice").click(() => $audioReview[0].play());

  $("#discard-voice").click(() => {
    $audioReview[0].pause();
    $audioReview[0].removeAttribute("src");
    audioBlob = null;
    $voiceModal.addClass("hidden");
  });

  $("#send-voice").click(async () => {
    $audioReview[0].pause();
    $voiceModal.addClass("hidden");
    if (!audioBlob) return;

    const fd = new FormData();
    fd.append("file", audioBlob, "voice_note.webm");
    fd.append("is_private", "1");

    try {
      const res = await fetch("/api/method/pcms.api.transcription.upload_voice_file", {
        method: "POST",
        headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
        credentials: "include",
        body: fd
      });

      const data = await res.json();
      if (res.ok && data.message?.file_url) {
        uploadVoiceMsg(data.message.file_url,data.message.sent_time,data.message.status);
      } else {
        throw new Error(data.message || data.error || res.statusText);
      }
    } catch (err) {
      console.error("Voice upload error:", err);
      alert("Voice upload failed: " + err.message);
    } finally {
      $audioReview[0].removeAttribute("src");
      audioBlob = null;
    }
  });

  function uploadVoiceMsg(url, sent_time, status) {
    const $voiceMsg = $("<div>").addClass("chat-message sent " + (status !== "New" ? "status-acknowledged" : ""));
  
    $("<audio>").attr({ controls: true, src: url }).appendTo($voiceMsg);
  
    const $footer = $("<div>").addClass("voice-footer").appendTo($voiceMsg);
    $("<span>").addClass("voice-time").text(sent_time).appendTo($footer);
    $("<span>").addClass((status !== "New" ? "status-acknowledged-text" : "voice-status")).text(status !== "New" ? "Acknowledged \u2713\u2713" : "\u2713").appendTo($footer);
  
    $chatBody.append($voiceMsg);
     // Remove oldest messages if limit exceeded
     const container = $chatBody[0];
     const excess = container.children.length - SentMessageLimit;
     for (let i = 0; i < excess; i++) {
       container.removeChild(container.firstElementChild);
     }
     
    scrollToBottom();
  }
  

  // Validate plain-text messages
  const regex = /^[A-Za-z0-9 _-]+$/;
  function isValidText(text) {
    return regex.test(text);
  }

  async function safeUploadTextMessage(text) {
    if (!isValidText(text)) {
      alert("❗ Invalid characters detected. Use only letters, numbers, spaces, dashes or underscores.");
      return;
    }
    try {
      const res = await fetch("/api/method/pcms.api.upload_text_message.upload_text_message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": frappe.csrf_token
        },
        credentials: "include",
        body: JSON.stringify({ message_content: text })
      });

      const json = await res.json();
      const data = json.message;

      if (!res.ok) {
        throw new Error(data.message || data.error || res.statusText);
      }
      appendMessage(data.message_content,data.sent_time,data.status);
      $messageInput.val("");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    }
  }
  // quick voice
  const voiceMap = {
    "headache": "/assets/pcms/voices/headache.mp3",
    "stomach_ache": "/assets/pcms/voices/stomach_ache.mp3",
    "chest_pain": "/assets/pcms/voices/chest_pain.mp3",
    "back_pain": "/assets/pcms/voices/back_pain.mp3",
    "joint_pain": "/assets/pcms/voices/joint_pain.mp3",
    "muscle_pain": "/assets/pcms/voices/muscle_pain.mp3",
    "toothache": "/assets/pcms/voices/toothache.mp3",
    "earache": "/assets/pcms/voices/earache.mp3",
    "sore_throat": "/assets/pcms/voices/sore_throat.mp3",
    "sharp_pain_in_my_side": "/assets/pcms/voices/sharp_pain_in_my_side.mp3",
    "nausea": "/assets/pcms/voices/nausea.mp3",
    "vomiting": "/assets/pcms/voices/vomiting.mp3",
    "diarrhea": "/assets/pcms/voices/diarrhea.mp3",
    "constipation": "/assets/pcms/voices/constipation.mp3",
    "heartburn": "/assets/pcms/voices/heartburn.mp3",
    "bloating": "/assets/pcms/voices/bloating.mp3",
    "loss_of_appetite": "/assets/pcms/voices/loss_of_appetite.mp3",
    "blood_in_stool": "/assets/pcms/voices/blood_in_stool.mp3",
    "black_stools": "/assets/pcms/voices/black_stools.mp3",
    "acid_reflux": "/assets/pcms/voices/acid_reflux.mp3",
    "cough": "/assets/pcms/voices/cough.mp3",
    "shortness_of_breath": "/assets/pcms/voices/shortness_of_breath.mp3",
    "wheezing": "/assets/pcms/voices/wheezing.mp3",
    "runny_nose": "/assets/pcms/voices/runny_nose.mp3",
    "sinus_pressure": "/assets/pcms/voices/sinus_pressure.mp3",
    "sneezing": "/assets/pcms/voices/sneezing.mp3",
    "chest_congestion": "/assets/pcms/voices/chest_congestion.mp3",
    "sore_lungs": "/assets/pcms/voices/sore_lungs.mp3",
    "post_nasal_drip": "/assets/pcms/voices/post_nasal_drip.mp3",
    "hoarse_voice": "/assets/pcms/voices/hoarse_voice.mp3",
    "dizziness": "/assets/pcms/voices/dizziness.mp3",
    "lightheadedness": "/assets/pcms/voices/lightheadedness.mp3",
    "numbness_in_hands": "/assets/pcms/voices/numbness_in_hands.mp3",
    "tingling_in_feet": "/assets/pcms/voices/tingling_in_feet.mp3",
    "blurred_vision": "/assets/pcms/voices/blurred_vision.mp3",
    "double_vision": "/assets/pcms/voices/double_vision.mp3",
    "ringing_in_ears": "/assets/pcms/voices/ringing_in_ears.mp3",
    "memory_lapses": "/assets/pcms/voices/memory_lapses.mp3",
    "brain_fog": "/assets/pcms/voices/brain_fog.mp3",
    "migraine": "/assets/pcms/voices/migraine.mp3",
    "rash": "/assets/pcms/voices/rash.mp3",
    "itchy_skin": "/assets/pcms/voices/itchy_skin.mp3",
    "hives": "/assets/pcms/voices/hives.mp3",
    "dry_patches": "/assets/pcms/voices/dry_patches.mp3",
    "acne_breakout": "/assets/pcms/voices/acne_breakout.mp3",
    "swelling": "/assets/pcms/voices/swelling.mp3",
    "bruising_easily": "/assets/pcms/voices/bruising_easily.mp3",
    "cracked_lips": "/assets/pcms/voices/cracked_lips.mp3",
    "night_sweats": "/assets/pcms/voices/night_sweats.mp3",
    "hot_flashes": "/assets/pcms/voices/hot_flashes.mp3",
    "frequent_urination": "/assets/pcms/voices/frequent_urination.mp3",
    "burning_when_urinating": "/assets/pcms/voices/burning_when_urinating.mp3",
    "blood_in_urine": "/assets/pcms/voices/blood_in_urine.mp3",
    "lower_abdominal_pain": "/assets/pcms/voices/lower_abdominal_pain.mp3",
    "vaginal_itching": "/assets/pcms/voices/vaginal_itching.mp3",
    "irregular_periods": "/assets/pcms/voices/irregular_periods.mp3",
    "erectile_dysfunction": "/assets/pcms/voices/erectile_dysfunction.mp3",
    "testicular_pain": "/assets/pcms/voices/testicular_pain.mp3",
    "breast_lump": "/assets/pcms/voices/breast_lump.mp3",
    "pain_during_sex": "/assets/pcms/voices/pain_during_sex.mp3",
    "anxiety": "/assets/pcms/voices/anxiety.mp3",
    "depression": "/assets/pcms/voices/depression.mp3",
    "panic_attacks": "/assets/pcms/voices/panic_attacks.mp3",
    "mood_swings": "/assets/pcms/voices/mood_swings.mp3",
    "insomnia": "/assets/pcms/voices/insomnia.mp3",
    "fatigue": "/assets/pcms/voices/fatigue.mp3",
    "lack_of_concentration": "/assets/pcms/voices/lack_of_concentration.mp3",
    "irritability": "/assets/pcms/voices/irritability.mp3",
    "suicidal_thoughts": "/assets/pcms/voices/suicidal_thoughts.mp3",
    "ptsd_flashbacks": "/assets/pcms/voices/ptsd_flashbacks.mp3",
    "fever": "/assets/pcms/voices/fever.mp3",
    "chills": "/assets/pcms/voices/chills.mp3",
    "weakness": "/assets/pcms/voices/weakness.mp3",
    "swollen_lymph_nodes": "/assets/pcms/voices/swollen_lymph_nodes.mp3",
    "weight_loss": "/assets/pcms/voices/weight_loss.mp3",
    "weight_gain": "/assets/pcms/voices/weight_gain.mp3",
    "excessive_thirst": "/assets/pcms/voices/excessive_thirst.mp3",
    "dry_mouth": "/assets/pcms/voices/dry_mouth.mp3",
    "bad_breath": "/assets/pcms/voices/bad_breath.mp3",
    "metallic_taste": "/assets/pcms/voices/metallic_taste.mp3",
    "asthma_flare_up": "/assets/pcms/voices/asthma_flare_up.mp3",
    "diabetes_high_sugar": "/assets/pcms/voices/diabetes_high_sugar.mp3",
    "low_blood_pressure": "/assets/pcms/voices/low_blood_pressure.mp3",
    "high_blood_pressure": "/assets/pcms/voices/high_blood_pressure.mp3",
    "arthritis_pain": "/assets/pcms/voices/arthritis_pain.mp3",
    "gout_attack": "/assets/pcms/voices/gout_attack.mp3",
    "fibromyalgia_pain": "/assets/pcms/voices/fibromyalgia_pain.mp3",
    "ibs_cramps": "/assets/pcms/voices/ibs_cramps.mp3",
    "crohns_flare_up": "/assets/pcms/voices/crohns_flare_up.mp3",
    "lupus_fatigue": "/assets/pcms/voices/lupus_fatigue.mp3",
    "allergies_acting_up": "/assets/pcms/voices/allergies_acting_up.mp3",
    "motion_sickness": "/assets/pcms/voices/motion_sickness.mp3",
    "vertigo": "/assets/pcms/voices/vertigo.mp3",
    "jaw_clicking": "/assets/pcms/voices/jaw_clicking.mp3",
    "heel_spur_pain": "/assets/pcms/voices/heel_spur_pain.mp3",
    "sciatica_pain": "/assets/pcms/voices/sciatica_pain.mp3",
    "restless_legs": "/assets/pcms/voices/restless_legs.mp3",
    "cold_hands_and_feet": "/assets/pcms/voices/cold_hands_and_feet.mp3",
    "hair_falling_out": "/assets/pcms/voices/hair_falling_out.mp3",
    "brittle_nails": "/assets/pcms/voices/brittle_nails.mp3"
  }; 


function openModal() {
  const modal = $("#quick-voice-modal");
  modal.removeClass("hidden");
  if (window.innerHeight < 800) {
    // mobile
    modal.css({
      position: 'absolute',
      top: window.scrollY + 'px'
    });
  }
}

function closeModal() {
  $("#quick-voice-modal").addClass("hidden").css({ position: '', top: '' });
}

$(document).on("click", "#open-quick-voice-modal", function () {
  openModal();  
});
$(document).on("click", "#close-quick-voice-modal", function () {
  closeModal();
});

// Live filtering
$("#voice-search").on("input", function() {
  const term = $(this).val().toLowerCase();
  $(".quick-voice-item").each(function(){
    const text = $(this).text().toLowerCase();
    $(this).toggle(text.includes(term));
  });
});

$(".quick-voice-item").click(async function () {
  const key = $(this).data("voice");
  const text = $(this).text();
  const url = voiceMap[key];
  if (!url) return;

  $("#quick-voice-modal").addClass("hidden");

  // uploadVoiceMsg(url, formatDateTime(new Date()), "New");

  // send to Frappe or directly to nursing
  try {
    // 1. Download the .webm file
    const downloadResp = await fetch(url);
    if (!downloadResp.ok) {
      throw new Error("Download failed: " + downloadResp.statusText);
    }
  
    // 2. Convert to Blob
    const blob = await downloadResp.blob();
    const fd = new FormData();
    fd.append("file", blob, "voice_note.webm");
    fd.append("is_private", "1");
    fd.append("text_msg", text);
  
    // 3. Upload it
    const uploadResp = await fetch("/api/method/pcms.api.transcription.upload_voice_file", {
      method: "POST",
      headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
      credentials: "include",
      body: fd,
    });
  
    // ✅ Crucial fix: await JSON parsing
    const resBody = await uploadResp.json();
  
    // If your backend wraps result in `message`, extract it
    const quickVoiceData = resBody.message || resBody;
  
    // 4a. Handle HTTP-level errors
    if (!uploadResp.ok) {
      let errMsg = quickVoiceData.error || quickVoiceData.message || `HTTP ${uploadResp.status}`;
      if (typeof errMsg === "object") try { errMsg = JSON.stringify(errMsg); } catch { errMsg = String(errMsg); }
      throw new Error(errMsg);
    }
  
    // 4b. Make sure file_url exists
    if (!quickVoiceData.file_url) {
      throw new Error("Unexpected response structure: no file_url");
    }
  
    // ✅ Success
    uploadVoiceMsg(quickVoiceData.file_url, quickVoiceData.sent_time, quickVoiceData.status);
  
  } catch (err) {
    console.error("Voice upload error:", err);
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    alert("Voice upload failed: " + msg);
  } finally {
    $audioReview[0].removeAttribute("src");
    audioBlob = null;
  }
  
});

function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12; // convert 0 to 12
  const hh = String(h).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${dd}-${mm}-${yyyy} ${hh}:${min} ${ampm}`;
}

});

