// jQuery Version
class VoiceRecorder {
  constructor() {
    this.audioChunks = [];
    this.recording = false;
    this.mediaRecorder = null;
    this.stream = null;
    this.$voiceBtn = null;
  }

  init() {
    this.$targetInput = $('#chat-body');
    if (!this.$targetInput.length) return alert("Transcription input field not found");
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    // const $wrapper = $('<div class="voice-input-group" style="display:flex;align-items:center;gap:8px;"></div>');
    // this.$targetInput.wrap($wrapper);

    this.$voiceBtn = $('#record-btn');
    // this.$targetInput.after(this.$voiceBtn);
  }

  bindEvents() {
    this.$voiceBtn.on('pointerdown', (e) => this.handleStart(e));
    $(document).on('pointerup', (e) => this.handleStop(e));
  }

  async handleStart(e) {
    e.preventDefault();
    if (this.recording) return;
 
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
  
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };
  
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          currentAudioUrl = URL.createObjectURL(audioBlob);
          $("#audio-review").attr("src", currentAudioUrl);
          $("#voice-modal").removeClass("hidden");
        };
  
        mediaRecorder.start();
        $(this).text("⏹️ Stop").addClass("recording");
  
        $(this).off("click").on("click", function () {
          mediaRecorder.stop();
          $(this).text("🎤 Record").removeClass("recording");
          $(this).off("click").on("click", startRecording);
        });
      } catch (err) {
        alert("Microphone access denied or not available.");
      }
    
  }

  async handleStop(e) {
    e.preventDefault();
    if (!this.recording || !this.mediaRecorder) return;
    try {
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const text = await this.transcribeAudio(audioBlob);

        const msgElement = $("<div>")
          .addClass("chat-message sent")
          .text(text);
          this.$targetInput.append(msgElement);
        this.$targetInput.scrollTop(this.$targetInput[0].scrollHeight);

      };
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      this.cleanup();
      this.$voiceBtn.html('🎤 Hold to Record').removeClass('btn-danger');
    }
  }

  async transcribeAudio(blob) {
    try {
      const base64data = await this.blobToBase64(blob);
      const response = await $.ajax({
        method: 'POST',
        url: '/pcms/api/transcription/transcribe_audio',
        data: JSON.stringify({ audio_data: base64data }),
        contentType: 'application/json'
      });
      return response.message?.text || "No transcription";
    } catch (err) {
      console.error(err);
      return "Transcription failed";
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }

  cleanup() {
    this.recording = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }
}

// Initialize
frappe.ready(function () {
  new VoiceRecorder().init();
});


// frappe.ready(function () {
//     const $chatBody = $("#chat-body");
//   const $messageInput = $("#message");

//   function scrollToBottom() {
//     $chatBody.scrollTop($chatBody[0].scrollHeight);
//   }

//   function appendMessage(text) {
//     const msgElement = $("<div>")
//       .addClass("chat-message sent")
//       .text(text);
//     $("#chat-body").append(msgElement);
//     $("#chat-body").scrollTop($("#chat-body")[0].scrollHeight);
//   }

//   $("#send-btn").on("click", function () {
//     const text = $messageInput.val().trim();
//     if (text) {
//       appendMessage(text);
//       $messageInput.val(""); // clear input
//     }
//   });

//   $messageInput.on("keypress", function (e) {
//     if (e.which === 13 && !e.shiftKey) {
//       e.preventDefault();
//       $("#send-btn").click(); // trigger send
//     }
//   });
  

//   // Voice recording logic
//   let mediaRecorder;
//   let audioChunks = [];
//   let currentAudioUrl = "";

//   $("#record-btn").on("click", async function startRecording() {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       mediaRecorder = new MediaRecorder(stream);
//       audioChunks = [];

//       mediaRecorder.ondataavailable = (e) => {
//         if (e.data.size > 0) audioChunks.push(e.data);
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

//     const voiceMessage = $("<div>").addClass("chat-message sent");
//     const audio = $("<audio controls>").attr("src", currentAudioUrl);
//     voiceMessage.append(audio);
//     $chatBody.append(voiceMessage);

//     scrollToBottom();
//     $("#voice-modal").addClass("hidden");
//     $("#audio-review").attr("src", "");
//     currentAudioUrl = "";
//   });
// // from old code
//    function blobToBase64(blob) {
//     return new Promise((resolve) => {
//       const reader = new FileReader();
//       reader.onload = () => resolve(reader.result.split(',')[1]);
//       reader.readAsDataURL(blob);
//     });
//   }
  
// });

