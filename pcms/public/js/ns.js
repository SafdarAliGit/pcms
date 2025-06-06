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
      fields: ["message_content", "sender","room_no","sender_name","sent_time","status"],
      order_by: "creation asc",
      limit_page_length: 50
    },
    callback: function (r) {
      if (r.message) {
        r.message.forEach(function (msg) {
          appendMessage(msg.sender, msg.message_content,msg.room_no,msg.sender_name,msg.sent_time,msg.status);
        });
      }
    }
  });

  frappe.realtime.on("new_message", function (data) {
    appendMessage(data.sender, data.message_content, data.room_no,data.sender_name,data.sent_time,data.status);
    // playNotificationSound();
  });

  function appendMessage(sender, message_content, room_no,sender_name,sent_time,status) {
    const container = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "chat-message";
    div.innerHTML = `
      <div class="sender">MR No: ${sender}, Name: ${sender_name}, Room No: ${room_no}</div>
      <div class="text">${message_content}</div>
      <div class="time">${sent_time}</div>
      <div class="status">${status}</div>
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

});

