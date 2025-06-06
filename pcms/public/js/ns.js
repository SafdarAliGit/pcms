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
    method: "frappe.client.get_list",
    args: {
      doctype: "Message",
      fields: ["message_content", "sender","sender_name","room_no","sent_time","status"],
      order_by: "creation asc",
      limit_page_length: 50
    },
    callback: function (r) {
      if (r.message) {
        r.message.forEach(function (msg) {
          appendMessage(msg.message_content, msg.sender,msg.sender_name,msg.room_no,msg.sent_time,msg.status);
        });
      }
    }
  });

  frappe.realtime.on("new_message", function (data) {
    appendMessage(data.message_content, data.sender,data.sender_name,data.room_no,data.sent_time,data.status);
    // playNotificationSound();
  });

  function appendMessage(message_content, sender, sender_name, room_no, sent_time, status) {
    const container = document.getElementById("messages");
    const div = document.createElement("div");
  
    // Normalize status to class format
    const statusClass = {
      "Open": "status-open",
      "In Progress": "status-in-progress",
      "Resolved": "status-resolved"
    }[status] || "status-open"; // fallback to 'open' if unrecognized
  
    div.className = `chat-message ${statusClass}`;
  
    div.innerHTML = `

<a class="login" href="" style="text-decoration: none; color: inherit;" type="button">

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
    </a>
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
  
  $('.login').on('click', function() {
    // Check if current user has 'Nurse' role
    frappe.call({
        method: 'frappe.client.get_roles',
        callback: function(res) {
            const roles = res.message || [];
            if (!roles.includes("Nurse")) {
                show_relogin_modal();  // Show re-login if not Nurse
            } else {
                frappe.msgprint("You have Nurse role. No re-login required.");
                // Place your authorized action here if needed
            }
        }
    });
  });
  
  function show_relogin_modal() {
  let d = new frappe.ui.Dialog({
    title: 'Re-login Required',
    fields: [
        {
            label: 'Username',
            fieldname: 'usr',
            fieldtype: 'Data',
            reqd: true
        },
        {
            label: 'Password',
            fieldname: 'pwd',
            fieldtype: 'Password',
            reqd: true
        }
    ],
    primary_action_label: 'Login',
    primary_action(values) {
        frappe.call({
            method: 'login',
            args: {
                usr: values.usr,
                pwd: values.pwd
            },
            callback: function (res) {
                if (res.message === "Logged In") {
                    frappe.msgprint(__('Re-authenticated successfully.'));
                    d.hide();
                    // Perform any follow-up actions here
                } else {
                    frappe.msgprint(__('Invalid credentials. Try again.'));
                }
            },
            error: function () {
                frappe.msgprint(__('Login failed.'));
            }
        });
    }
  });
  d.show();
}
});

