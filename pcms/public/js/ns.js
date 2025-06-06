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
      fields: ["message_content", "owner"],
      order_by: "creation asc",
      limit_page_length: 50
    },
    callback: function (r) {
      if (r.message) {
        r.message.forEach(function (msg) {
          appendMessage(msg.owner, msg.message_content);
        });
      }
    }
  });

  frappe.realtime.on("new_message", function (data) {
    appendMessage(data.sender, data.message);
    // playNotificationSound();
  });

  function appendMessage(sender, message) {
    const container = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "chat-message";
    div.innerHTML = `
      <div class="sender">${sender}</div>
      <div class="text">${message}</div>
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

