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



frappe.ready(function () {
  frappe.realtime.init();
  const $chatBody = $("#chat-body");
  const $messageInput = $("#message");
  const $voiceModal = $("#voice-modal");
  const $audioReview = $("#audio-review");

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
 console.log(room);
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
  "i_cant_breathe_well_lying_down": "/assets/pcms/voices/i_cant_breathe_well_lying_down.webm",
  "i_feel_anxious": "/assets/pcms/voices/i_feel_anxious.webm",
  "i_feel_chest_tightness": "/assets/pcms/voices/i_feel_chest_tightness.webm",
  "i_feel_cold_chills": "/assets/pcms/voices/i_feel_cold_chills.webm",
  "i_feel_dizzy": "/assets/pcms/voices/i_feel_dizzy.webm",
  "i_feel_faint": "/assets/pcms/voices/i_feel_faint.webm",
  "i_feel_lightheaded": "/assets/pcms/voices/i_feel_lightheaded.webm",
  "i_feel_nauseous": "/assets/pcms/voices/i_feel_nauseous.webm",
  "i_feel_sweaty": "/assets/pcms/voices/i_feel_sweaty.webm",
  "i_feel_weak": "/assets/pcms/voices/i_feel_weak.webm",
  "i_have_a_fever": "/assets/pcms/voices/i_have_a_fever.webm",
  "i_have_a_rash": "/assets/pcms/voices/i_have_a_rash.webm",
  "i_have_a_sore_throat": "/assets/pcms/voices/i_have_a_sore_throat.webm",
  "i_have_bleeding": "/assets/pcms/voices/i_have_bleeding.webm",
  "i_have_bruises": "/assets/pcms/voices/i_have_bruises.webm",
  "i_have_diarrhea": "/assets/pcms/voices/i_have_diarrhea.webm",
  "i_have_heartburn": "/assets/pcms/voices/i_have_heartburn.webm",
  "i_have_indigestion": "/assets/pcms/voices/i_have_indigestion.webm",
  "im_always_thirsty": "/assets/pcms/voices/im_always_thirsty.webm",
  "im_constipated": "/assets/pcms/voices/im_constipated.webm",
  "im_coughing": "/assets/pcms/voices/im_coughing.webm",
  "im_forgetting_things": "/assets/pcms/voices/im_forgetting_things.webm",
  "im_gaining_weight": "/assets/pcms/voices/im_gaining_weight.webm",
  "im_having_trouble_sleeping": "/assets/pcms/voices/im_having_trouble_sleeping.webm",
  "im_losing_weight": "/assets/pcms/voices/im_losing_weight.webm",
  "im_passing_gas": "/assets/pcms/voices/im_passing_gas.webm",
  "im_really_tired": "/assets/pcms/voices/im_really_tired.webm",
  "im_shivering": "/assets/pcms/voices/im_shivering.webm",
  "im_short_of_breath": "/assets/pcms/voices/im_short_of_breath.webm",
  "im_sneezing": "/assets/pcms/voices/im_sneezing.webm",
  "im_sweating_at_night": "/assets/pcms/voices/im_sweating_at_night.webm",
  "i_need_to_pee_often": "/assets/pcms/voices/i_need_to_pee_often.webm",
  "i_see_double": "/assets/pcms/voices/i_see_double.webm",
  "it_hurts_when_i_pee": "/assets/pcms/voices/it_hurts_when_i_pee.webm",
  "ive_been_vomiting": "/assets/pcms/voices/ive_been_vomiting.webm",
  "my_back_hurts": "/assets/pcms/voices/my_back_hurts.webm",
  "my_chest_hurts": "/assets/pcms/voices/my_chest_hurts.webm",
  "my_ears_ring": "/assets/pcms/voices/my_ears_ring.webm",
  "my_gums_bleed": "/assets/pcms/voices/my_gums_bleed.webm",
  "my_head_hurts": "/assets/pcms/voices/my_head_hurts.webm",
  "my_heart_is_racing": "/assets/pcms/voices/my_heart_is_racing.webm",
  "my_joints_ache": "/assets/pcms/voices/my_joints_ache.webm",
  "my_legs_are_swollen": "/assets/pcms/voices/my_legs_are_swollen.webm",
  "my_mouth_is_dry": "/assets/pcms/voices/my_mouth_is_dry.webm",
  "my_muscles_ache": "/assets/pcms/voices/my_muscles_ache.webm",
  "my_nose_is_stuffy": "/assets/pcms/voices/my_nose_is_stuffy.webm",
  "my_skin_is_itchy": "/assets/pcms/voices/my_skin_is_itchy.webm",
  "my_stomach_hurts": "/assets/pcms/voices/my_stomach_hurts.webm",
  "my_throat_hurts_to_swallow": "/assets/pcms/voices/my_throat_hurts_to_swallow.webm",
  "my_vision_is_blurry": "/assets/pcms/voices/my_vision_is_blurry.webm",
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
  uploadVoiceMsg(url, formatDateTime(new Date()), "New");

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

