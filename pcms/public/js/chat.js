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
});

// quick voice
frappe.ready(function () {
  const voiceMap = {
    "headache": "/assets/pcms/voices/headache.webm",
    "belly_pain": "/assets/pcms/voices/belly_pain.webm",
    "breathing": "/assets/pcms/voices/breathing_issue.webm"
  };

  $("#open-quick-voice-modal").click(() => $("#quick-voice-modal").removeClass("hidden"));
  $("#close-quick-voice-modal").click(() => $("#quick-voice-modal").addClass("hidden"));

  $(".quick-voice-item").click(async function () {
    const key = $(this).data("voice");
    const url = voiceMap[key];
    if (!url) return;

    $("#quick-voice-modal").addClass("hidden");
    uploadVoiceMsg(url, formatDateTime(new Date()), "New");

    // send to Frappe or directly to nursing
    frappe.call({
      method: "pcms.api.messaging.send_voice",
      args: { voice_url: url },
      callback: () => console.log("sent voice:", key)
    });
  });
});
