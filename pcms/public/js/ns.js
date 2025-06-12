let nursing_station = {
  name: "",
}

window.frappe = window.frappe || {};
frappe.ready = function (fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn);
};

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

  // Fetch existing messages
  frappe.call({
    method: "pcms.api.list_ns_messages.list_ns_messages",
    callback: function (r) {
      if (r.message) {
        r.message.forEach(function (msg) {
          appendMessage(msg.message_content, msg.sender,msg.sender_name,msg.room_no,msg.sent_time,msg.status,msg.audio);
        });
      }
    }
  });

  frappe.call({
    method: 'pcms.api.get_nursing_station.get_nursing_station',
    callback: function(r) {
        if (r.message) nursing_station.name = r.message;
    }
});

// 2. Independent realtime setup
const room = "nursing_station:"+(nursing_station.name)
    .replace(/\W+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();


  frappe.realtime.on("SZH-Radiology-NS3", function (data) {
    appendMessage(data.message_content, data.sender,data.sender_name,data.room_no,data.sent_time,data.status,data.audio);
    // playNotificationSound();
  });

  function appendMessage(message_content, sender, sender_name, room_no, sent_time, status,audio) {
    const container = document.getElementById("messages");
    const div = document.createElement("div");
  
    // Normalize status to class format
    const statusClass = {
      "New": "status-new",
      "Acknowledged": "status-acknowledged",
      "Resolved": "status-resolved",
      "Escalated": "status-escalated"
    }[status] || "status-new"; // fallback to 'open' if unrecognized
  
    div.className = `chat-message ${statusClass}`;
  
    div.innerHTML = `
      <div class="chat-meta">
        <div class="meta-block">
          <span class="meta-label">MR No:</span>
          <span class="meta-value">${sender}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Name:</span>
          <span class="meta-value">${sender_name}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Room No:</span>
          <span class="meta-value">${room_no}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Time:</span>
          <span class="meta-value">${sent_time}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Status:</span>
          <span class="meta-value">${status}</span>
        </div>
      </div>
      <div class="chat-text">${message_content}</div>
      ${audio ? `<audio controls src="${audio}"></audio>` : ''}
      <button class="login_button" style="text-decoration: none; color: inherit;">Take Action</button>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
  
  

  //   function playNotificationSound() {
//   const audio = new Audio("https://transcription.thesmarterp.com/assets/pcms/sounds/message_received.mp3");
//   audio.play().catch((err) => {
//     console.warn("Audio play failed:", err);
//   });
// }
// LOGIN



});

frappe.ready(function () {
  $(document).on("click", ".login_button", function () {
    frappe.call({
      method: 'pcms.utils.get_user_roles.get_user_roles',
      callback: function (res) {
        const roles = res.message || [];
        if (!roles.includes("Nurse")) {
          $("#relogin-modal").show();
        } else {
          frappe.msgprint("You have Nurse role.");
        }
      }
    });
  });
  
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

