// // jQuery Version
// class VoiceRecorder {
//   constructor() {
//     this.audioChunks = [];
//     this.recording = false;
//     this.mediaRecorder = null;
//     this.stream = null;
//     this.$voiceBtn = null;
//   }

//   init() {
//     this.$targetInput = $('#chat-body');
//     if (!this.$targetInput.length) return alert("Transcription input field not found");
//     this.createUI();
//     this.bindEvents();
//   }

//   createUI() {
//     // const $wrapper = $('<div class="voice-input-group" style="display:flex;align-items:center;gap:8px;"></div>');
//     // this.$targetInput.wrap($wrapper);

//     this.$voiceBtn = $('#record-btn');
//     // this.$targetInput.after(this.$voiceBtn);
//   }

//   bindEvents() {
//     this.$voiceBtn.on('pointerdown', (e) => this.handleStart(e));
//     $(document).on('pointerup', (e) => this.handleStop(e));
//   }

//   async handleStart(e) {
//     e.preventDefault();
//     if (this.recording) return;
//     try {
//       this.recording = true;
//       this.$voiceBtn.html('🔴 Recording...').addClass('btn-danger');
//       this.audioChunks = [];

//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           channelCount: 1,
//           sampleRate: 16000,
//           sampleSize: 16,
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true
//         }
//       });
//       this.stream = stream;

//       this.mediaRecorder = new MediaRecorder(this.stream, {
//         mimeType: 'audio/webm;codecs=opus',
//         audioBitsPerSecond: 32000
//       });

//       this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
//       this.mediaRecorder.start();
//     } catch (err) {
//       alert(`Microphone error: ${err.message}`);
//       this.cleanup();
//     }
//   }

//   async handleStop(e) {
//     e.preventDefault();
//     if (!this.recording || !this.mediaRecorder) return;
//     try {
//       this.mediaRecorder.onstop = async () => {
//         const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
//         const text = await this.transcribeAudio(audioBlob);

//         const msgElement = $("<div>")
//           .addClass("chat-message sent")
//           .text(text);
//           this.$targetInput.append(msgElement);
//         this.$targetInput.scrollTop(this.$targetInput[0].scrollHeight);

//       };
//       this.mediaRecorder.stop();
//       this.stream.getTracks().forEach(track => track.stop());
//     } catch (err) {
//       alert(`Error: ${err.message}`);
//     } finally {
//       this.cleanup();
//       this.$voiceBtn.html('🎤 Hold to Record').removeClass('btn-danger');
//     }
//   }

//   async transcribeAudio(blob) {
//     try {
//       const base64data = await this.blobToBase64(blob);
//       const response = await $.ajax({
//         method: 'POST',
//         url: '/pcms/api/transcription/transcribe_audio',
//         data: JSON.stringify({ audio_data: base64data }),
//         contentType: 'application/json'
//       });
//       return response.message?.text || "No transcription";
//     } catch (err) {
//       console.error(err);
//       return "Transcription failed";
//     }
//   }

  // blobToBase64(blob) {
  //   return new Promise((resolve) => {
  //     const reader = new FileReader();
  //     reader.onload = () => resolve(reader.result.split(',')[1]);
  //     reader.readAsDataURL(blob);
  //   });
  // }

//   cleanup() {
//     this.recording = false;
//     if (this.stream) {
//       this.stream.getTracks().forEach(track => track.stop());
//       this.stream = null;
//     }
//     this.mediaRecorder = null;
//   }
// }

// // Initialize
// frappe.ready(function () {
//   new VoiceRecorder().init();
// });

// ======================================================



// frappe.ready(function () {
//   const $chatBody = $("#chat-body");
//   const $messageInput = $("#message");

//   function scrollToBottom() {
//     $chatBody.scrollTop($chatBody[0].scrollHeight);
//   }

//   function appendMessage(text) {
//     const $msg = $("<div>").addClass("chat-message sent").text(text);
//     $chatBody.append($msg);
//     scrollToBottom();
//   }

//   $("#send-btn").on("click", function () {
//     const text = $messageInput.val().trim();
//     if (text) {
//       appendMessage(text);
//       $messageInput.val("");
//     }
//   });

//   $messageInput.on("keypress", function (e) {
//     if (e.which === 13 && !e.shiftKey) {
//       e.preventDefault();
//       $("#send-btn").click();
//     }
//   });

//   // --- Voice recording logic ---
//   let mediaRecorder;
//   let audioChunks = [];
//   let currentAudioUrl = "";

//   $("#record-btn").on("click", async function startRecording() {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           channelCount: 1,
//           sampleRate: 16000,
//           sampleSize: 16,
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true
//         }
//       });
//       mediaRecorder = new MediaRecorder(stream,{
//         mimeType: 'audio/webm;codecs=opus',
//         audioBitsPerSecond: 32000
//       });
//       audioChunks = [];

//       mediaRecorder.ondataavailable = (e) => {
//         if (e.data.size > 0) {
//           audioChunks.push(e.data);
//         }
//       };

//       mediaRecorder.onstop = () => {
//         const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
//         currentAudioUrl = URL.createObjectURL(audioBlob);
//         $("#audio-review").attr("src", currentAudioUrl);
//         $("#voice-modal").removeClass("hidden");
//       };

//       mediaRecorder.start();
//       $(this).text("⏹️ Stop").addClass("recording");

//       $(this).off("click").on("click", function () {
//         mediaRecorder.stop();
//         $(this).text("🎤 Record").removeClass("recording");
//         $(this).off("click").on("click", startRecording);
//       });
//     } catch (err) {
//       alert("Microphone access denied or not available.");
//     }
//   });

//   $("#play-voice").on("click", function () {
//     const audio = document.getElementById("audio-review");
//     audio.play();
//   });

//   $("#discard-voice").on("click", function () {
//     $("#audio-review").attr("src", "");
//     $("#voice-modal").addClass("hidden");
//     currentAudioUrl = "";
//   });

//   $("#send-voice").on("click", function () {
//     if (!currentAudioUrl) return;

//     const voiceMsg = $("<div>").addClass("chat-message sent");
//     const audio = $("<audio controls>").attr("src", currentAudioUrl);
//     voiceMsg.append(audio);
//     $chatBody.append(voiceMsg);

//     scrollToBottom();
//     $("#voice-modal").addClass("hidden");
//     $("#audio-review").attr("src", "");
//     currentAudioUrl = "";
//   });
// });


frappe.ready(function () {
  const $chatBody = $("#chat-body");
  const $messageInput = $("#message");
  const $voiceModal = $("#voice-modal");
  const $audioReview = $("#audio-review");

  function scrollToBottom() {
    $chatBody.scrollTop($chatBody[0].scrollHeight);
  }

  function appendMessage(text) {
    const $msg = $("<div>").addClass("chat-message sent").text(text);
    $chatBody.append($msg);
    scrollToBottom();
  }

  $("#send-btn").on("click", function () {
    const text = $messageInput.val().trim();
    if (text) {
      appendMessage(text);
      $messageInput.val("");
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

  // $("#send-voice").on("click", function () {
  //   if (!currentAudioUrl) return;

  //   const $voiceMsg = $("<div>").addClass("chat-message sent");
  //   const $audio = $("<audio controls>").attr("src", currentAudioUrl);
  //   $voiceMsg.append($audio);
  //   $chatBody.append($voiceMsg);

  //   scrollToBottom();

  //   $voiceModal.addClass("hidden");
  //   $audioReview[0].pause();
  //   $audioReview[0].src = "";
  //   currentAudioUrl = "";
  // });

  $("#send-voice").on("click", function () {
    $audioReview[0].pause();
    $voiceModal.addClass("hidden");
  
    if (!audioBlob) return;
  
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_note.webm");
    formData.append("is_private", "1");
  
    fetch("/api/method/pcms.api.transcription.transcribe_audio", {
      method: "POST",
      args: { "audio_data": formData },
      headers: {
        "X-Frappe-CSRF-Token": frappe.csrf_token,
      },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        // if (data.message && data.message.file_url) {
        //   const fileUrl = data.message.file_url;
  
        //   const $voiceMsg = $("<div>").addClass("chat-message sent");
        //   const $audio = $("<audio controls>").attr("src", fileUrl);
        //   $voiceMsg.append($audio);
        //   $("#chat-body").append($voiceMsg);
        //   scrollToBottom();
        // } else {
        //   console.error("Upload failed", data);
        //   alert("Upload failed");
        // }
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

  
});
