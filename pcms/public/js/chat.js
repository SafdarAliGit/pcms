


frappe.ready(function () {
  const $chatBody = $("#chat-body");
  const $messageInput = $("#message");
  const $voiceModal = $("#voice-modal");
  const $audioReview = $("#audio-review");

  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Message",
      fields: ["audio"],
      order_by: "creation asc",
      limit_page_length: 50
    },
    callback: function (r) {
      if (r.message) {
        r.message.forEach(function (msg) {
          if (msg.audio) {
            uploadVoiceMsg(msg.audio);
          }else{
            appendMessage(msg.message_content);
          }
        });
      }
    }
  });

  function scrollToBottom() {
    $chatBody.scrollTop($chatBody[0].scrollHeight);
  }

  function appendMessage(text) {
    const $msg = $("<div>").addClass("chat-message sent").text(text);
    $chatBody.append($msg);
    scrollToBottom();
  }

  $("#send-btn").on("click", async function () {
    const text = $messageInput.val().trim();
    if (text) {
      

      await safeUploadTextMessage(text);


    }
  });

  $messageInput.on("keypress", function (e) {
    if (e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      $("#send-btn").click();
    }
  });

  // Voice recording logic
  let mediaRecorder;
  let audioChunks = [];
  let audioBlob;
  let currentAudioUrl = "";

  $("#record-btn").on("click", async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 64000
      });

      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        currentAudioUrl = URL.createObjectURL(audioBlob);

        // Use .srcObject with a Blob if needed
        $audioReview[0].src = currentAudioUrl;
        $audioReview[0].load();

        $voiceModal.removeClass("hidden");

        // Stop all tracks (microphone)
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      $(this).text("⏹️ Stop").addClass("recording");

      // Switch button behavior to stop
      $(this).off("click").on("click", function () {
        mediaRecorder.stop();
        $(this).text("🎤 Record").removeClass("recording");
        $(this).off("click").on("click", startRecording);
      });
    } catch (err) {
      alert("Microphone access denied or not available.");
      console.error(err);
    }
  });

  $("#play-voice").on("click", function () {
    $audioReview[0].play();
  });

  $("#discard-voice").on("click", function () {
    $audioReview[0].pause();
    $audioReview[0].src = "";
    currentAudioUrl = "";
    $voiceModal.addClass("hidden");
  });


  $("#send-voice").on("click", function () {
    $audioReview[0].pause();
    $voiceModal.addClass("hidden");
  
    if (!audioBlob) return;
  
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_note.webm");
    formData.append("is_private", "1");
  
    fetch("/api/method/pcms.api.transcription.upload_voice_file", {
      method: "POST",
      headers: {
        "X-Frappe-CSRF-Token": frappe.csrf_token,
      },
      credentials: "include",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.message && data.message.file_url) {
          const fileUrl = data.message.file_url;
  
          uploadVoiceMsg(fileUrl);
        } else {
          console.error("Upload failed", data);
          alert("Upload failed");
        }
      })
      .catch(err => {
        console.error("Error uploading voice:", err);
        alert("Voice upload error");
      });
  
    // Clear blob/url
    $audioReview[0].src = "";
    currentAudioUrl = "";
    audioBlob = null;
  });

  function uploadVoiceMsg(fileUrl) {
    const $voiceMsg = $("<div>").addClass("chat-message sent");
    const $audio = $("<audio controls>").attr("src", fileUrl);
    $voiceMsg.append($audio);
    $("#chat-body").append($voiceMsg);
    scrollToBottom();
  }

  // 1. Whitelist validation function
function isValidText(text) {
  // Only A-Z, a-z, 0-9, space, dash(-), underscore(_)
  const regex = /^[A-Za-z0-9 _-]+$/;
  return regex.test(text);
}

// 2. Wrapper upload function with whitelist check
async function safeUploadTextMessage(text) {
  if (!text || !isValidText(text)) {
    alert("❗ Invalid characters detected. Please use letters, numbers, spaces, dashes or underscores only.");
    return;
  }

  try {
    const payload = {
      message_content: text
    };

    const response = await fetch("/api/method/pcms.api.upload_text_message.upload_text_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": frappe.csrf_token
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.json()
        .then(data => data.message || data.error || JSON.stringify(data))
        .catch(() => response.statusText || `HTTP ${response.status}`);
      throw new Error(errText);
    }

    const data = await response.json();
    appendMessage(data.message_content);
    $messageInput.val("");
  } catch (err) {
    console.error("Upload failed:", err);
    alert(`Upload failed: ${err.message}`);
  }
}

  
});
