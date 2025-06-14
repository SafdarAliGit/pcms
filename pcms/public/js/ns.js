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
        r.message.forEach(function (msg) {
          appendMessage(
            msg.message_content,
            msg.sender,
            msg.sender_name,
            msg.room_no,
            msg.sent_time,
            msg.status,
            msg.audio
          );
        });
      }
    }
  });

  // 3. Realtime room subscription
  const stationName = window.nursing_station || "";
  const room = stationName.replace(/[-\s]/g, "").toLowerCase();

  frappe.realtime.on(room, function (data) {
    frappe.call({
      method: "pcms.api.list_ns_messages.list_ns_messages",
      callback: function (r) {
        if (r.message) {
          r.message.forEach(function (msg) {
            appendMessage(
              msg.message_content,
              msg.sender,
              msg.sender_name,
              msg.room_no,
              msg.sent_time,
              msg.status,
              msg.audio
            );
          });
        }
      }
    });
    
  });

  frappe.realtime.on(room+"_update", function (data) {
    
    frappe.call({
      method: "pcms.api.list_ns_messages.list_ns_messages",
      callback: function (r) {
        if (r.message) {
          r.message.forEach(function (msg) {
            appendMessage(
              msg.message_content,
              msg.sender,
              msg.sender_name,
              msg.room_no,
              msg.sent_time,
              msg.status,
              msg.audio
            );
          });
        }
      }
    });

  });

  // 4. Message rendering
  function appendMessage(message_content, sender, sender_name, room_no, sent_time, status, audio) {
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
      ${(status === "New" || status === "Acknowledged") ? `<button class="login_button" style="text-decoration: none; color: inherit;">Take Action</button>` : ''}
    `;

    $container.append(div);
    $container.scrollTop($container[0].scrollHeight);
  }
});


// Login and re-authentication logic
frappe.ready(function () {
  // Handle Take Action button click
  $(document).on("click", ".login_button", function () {
    frappe.call({
      method: 'pcms.utils.get_user_roles.get_user_roles',
      callback: function (res) {
        const roles = res.message || [];
        console.log(roles);
        if (!roles.includes("Nurse")) {
          $("#relogin-modal").show();
        } else {
          frappe.msgprint("You have Nurse role.");
        }
      }
    });
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
          frappe.msgprint("Re-authenticated.");
          $("#relogin-modal").hide();
        } else {
          frappe.msgprint("Invalid credentials.");
        }
      }
    });
  });
});
