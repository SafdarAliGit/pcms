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
frappe.ready(function () {
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

  // frappe.realtime.on(room, function (data) {
  //   frappe.call({
  //     method: "pcms.api.list_ns_messages.list_ns_messages",
  //     callback: function (r) {
  //       if (r.message) {
  //         $container.empty(); 
  //         r.message.forEach(function (msg) {
  //           appendMessage(
  //             msg.message_content,
  //             msg.sender,
  //             msg.sender_name,
  //             msg.room_no,
  //             msg.sent_time,
  //             msg.status,
  //             msg.audio,
  //             msg.symptoms_audio,
  //             msg.name
  //           );
  //         });
  //       }
  //     }
  //   });
    
  // });

  frappe.realtime.on(room, function (data) {
    console.log("Socket message:", data);
    // frappe.call({
    //   method: "pcms.api.list_ns_messages.list_ns_messages",
    //   callback: function (r) {
    //     if (r.message) {
    //       $container.empty(); 
    //       r.message.forEach(function (msg) {
    //         appendMessage(
    //           msg.message_content,
    //           msg.sender,
    //           msg.sender_name,
    //           msg.room_no,
    //           msg.sent_time,
    //           msg.status,
    //           msg.audio,
    //           msg.symptoms_audio,
    //           msg.name
    //         );
    //       });
    //     }
    //   }
    // });
    
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
      ${audio ? `<audio controls src="${audio}"></audio>` : ''}
      ${symptoms_audio ? `<audio style="margin-top: 10px;border:2px solid red;border-radius:25px;" controls src="${symptoms_audio}"></audio>` : ''}
      <button class="login_button" style="text-decoration: none; color: inherit;" data-name="${message_name}">Take Action</button>
    `;

    $container.append(div);
    $container.scrollTop($container[0].scrollHeight);
  }
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




