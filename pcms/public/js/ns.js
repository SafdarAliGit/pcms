// Ensure frappe namespace exists
window.frappe = window.frappe || {};

// DOM Ready handler
frappe.ready = function (fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
};

// Realtime setup
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

// DOM Ready Logic
frappe.ready( async function () {
  // 1. Initialize realtime connection
  frappe.realtime.init();
  const $container = $("#messages");
  // 2. Fetch existing messages
  frappe.call({
    method: "pcms.api.list_ns_messages.list_ns_messages",
    callback: function (r) {
      if (r.message) {
        $container.empty(); 
        r.message.forEach(function (msg) {
          appendMessage(
            msg.message_content,
            msg.sender,
            msg.sender_name,
            msg.room_no,
            msg.sent_time,
            msg.status,
            msg.audio,
            msg.symptoms_audio,
            msg.name
          );
        });
      }
    }
  });

  // 3. Realtime room subscription
  const stationName = window.nursing_station || "";
  const room = stationName.replace(/[-\s]/g, "").toLowerCase();

  frappe.realtime.on(room, function (data) {
        if (data) {
          // $container.empty(); 
            appendMessage(
              data.message_content,
              data.sender,
              data.sender_name,
              data.room_no,
              data.sent_time,
              data.status,
              data.audio,
              data.symptoms_audio,
              data.name
            );
        }
  });

  frappe.realtime.on(room+"_update", function (data) {
    
    frappe.call({
      method: "pcms.api.list_ns_messages.list_ns_messages",
      callback: function (r) {
        if (r.message) {
          $container.empty(); 
          r.message.forEach(function (msg) {
            appendMessage(
              msg.message_content,
              msg.sender,
              msg.sender_name,
              msg.room_no,
              msg.sent_time,
              msg.status,
              msg.audio,
              msg.symptoms_audio,
              msg.name
            );
          });
        }
      }
    });

  });
     
    // app settings
  let ReceivedMessageLimit = 50;
  const r = await frappe.call({
    method: 'pcms.api.app_settings.get_app_settings',
  });
  ReceivedMessageLimit = r.message.display_received_messages;

  // 4. Message rendering
  function appendMessage(message_content, sender, sender_name, room_no, sent_time, status, audio, symptoms_audio, message_name) {
    const div = document.createElement("div");
    const statusClass = {
      "New": "status-new",
      "Acknowledged": "status-acknowledged",
      "Resolved": "status-resolved",
      "Escalated": "status-escalated"
    }[status] || "status-new";
    div.className = `chat-message ${statusClass}`;
  
    div.innerHTML = `
      <div class="chat-meta">
        <div class="meta-block"><span class="meta-label">MR No:</span> <span class="meta-value">${sender}</span></div>
        <div class="meta-block"><span class="meta-label">Name:</span> <span class="meta-value">${sender_name}</span></div>
        <div class="meta-block"><span class="meta-label">Room No:</span> <span class="meta-value">${room_no}</span></div>
        <div class="meta-block"><span class="meta-label">Time:</span> <span class="meta-value">${sent_time}</span></div>
        <div class="meta-block"><span class="meta-label">Status:</span> <span class="meta-value">${status}</span></div>
      </div>
      <div class="chat-text">${message_content}</div>
  
      ${audio ? `
        <audio class="voice-audio" preload="metadata">
          <source src="${audio}" type="audio/webm">
          Your browser doesn’t support this audio format.
        </audio>
        <button class="audio-btn" data-type="voice">🔊 Play Voice</button>
      ` : ''}
  
      ${symptoms_audio ? `
        <audio class="symptom-audio" preload="metadata">
          <source src="${symptoms_audio}" type="audio/mpeg">
          Your browser doesn’t support this audio format.
        </audio>
        <button class="audio-btn" data-type="symptom">🎤 Play Symptoms</button>
      ` : ''}
  
      <button class="login_button" data-name="${message_name}">Take Action</button>
    `;
  
    $container.append(div);
     // Remove oldest messages if limit exceeded
     const container = $container[0];
    const excess = container.children.length - ReceivedMessageLimit;
    for (let i = 0; i < excess; i++) {
      container.removeChild(container.firstElementChild);
    }

    $container.scrollTop($container[0].scrollHeight);
  }
  
    // play voices
    let currentAudio = null;

    document.addEventListener('click', e => {
      if (!e.target.classList.contains('audio-btn')) return;
    
      const btn = e.target;
      const type = btn.dataset.type;
      const audioEl = btn.previousElementSibling;
      if (!audioEl) return;
    
      document.querySelectorAll('audio').forEach(a => {
        if (a !== audioEl) a.pause();
      });
    
      if (audioEl.paused) {
        audioEl.play().catch(() => {});
        btn.textContent = type === 'voice' ? "⏸️ Pause Voice" : "⏸️ Pause Symptoms";
      } else {
        audioEl.pause();
        btn.textContent = type === 'voice' ? "🔊 Play Voice" : "🎤 Play Symptoms";
      }
    
      audioEl.onended = () => {
        btn.textContent = type === 'voice' ? "🔊 Play Voice" : "🎤 Play Symptoms";
      };
    });
    
    
});







frappe.ready(function () {
  let currentMessage = {};

  $(document).on('click', '.login_button', async function() {
      const name = $(this).data('name');
      currentMessage.name = name;
  
    const r = await frappe.call({
      method: 'frappe.client.get',
      args: { doctype: 'Message', name }
    });
    const doc = r.message;
    $('#treatment').val(doc.treatment || '');
    setStatus(doc.status || '');
    $('#actionModal').modal('show');
    $('#reloginDisplay').on('click', function() {
      $('#actionModal').modal('hide');
      show_relogin_modal();
    });
  });
  
  function setStatus(st) {
    currentMessage.status = st;
    $('#statusDisplay').text(st);
    $('#actionModal .modal-content').css('background-color', statusColor(st));
  }
  
  // Status buttons update immediately
  $(document).on('click', '#actionModal .status-btn', function() {
    setStatus($(this).data('status'));
  });
  
  // Save via AJAX
  $('#saveAction').click(() => {
    const payload = {
      name: currentMessage.name,
      treatment: $('#treatment').val(),
      status: currentMessage.status
    };
    frappe.call({
      method: 'pcms.api.update_message.update_message',
      args: payload,
      callback: () => {
        $('#actionModal').modal('hide');
      }
    });
  });
  
  // Utility: map status to color
  function statusColor(st) {
    return {
      'Acknowledged': '#acc40d',
      'Resolved':     '#63f38e',
      'Escalated':    '#fab4b4'
    }[st] || '#e4a029';
  }
 async function show_relogin_modal() {
    $("#relogin-modal").removeClass("hidden");
  }
  function hide_relogin_modal() {
    $("#relogin-modal").addClass("hidden");
  }
  $(document).on("click", "#relogin-cancel", function () {
    hide_relogin_modal();

    
  });

    // Handle re-login form submission
  $(document).on("click", "#relogin-submit", function () {
    const usr = $("#relogin-username").val();
    const pwd = $("#relogin-password").val();

    frappe.call({
      method: 'login',
      args: { usr, pwd },
      callback: function (res) {
        if (res.message === "Logged In") {      
          $("#relogin-modal").addClass("hidden");
          window.location.reload();
        } else {
          $("#relogin-error")
          .text("Invalid credentials.")
          .addClass("text-red");
        }
      }
    });
  });
  
});




