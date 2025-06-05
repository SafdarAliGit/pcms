$(document).ready(function () {
    const $messageList = $("#message-list");
    const $modal = $("#message-modal");
    const $modalText = $("#modal-message-text");
  
    function showAlert(message) {
      alert("🚨 New Message from Patient: " + message);
    }
  
    function showModal(message) {
      $modalText.text(message);
      $modal.removeClass("hidden");
    }
  
    function addMessage(id, text, from = "Patient") {
      const msg = $(`
        <div class="ns-message" data-id="${id}">
          <div class="from">From: ${from}</div>
          <div class="text">${text}</div>
          <button class="action-btn">Action</button>
        </div>
      `);
  
      msg.find(".action-btn").on("click", function () {
        showModal(text);  // Login not required now
      });
  
      $messageList.prepend(msg);
      showAlert(text);
    }
  
    $(".close-btn").on("click", function () {
      $modal.addClass("hidden");
    });
  
    $("#respond-btn").on("click", function () {
      window.location.href = "/nurse-response"; // Adjust if needed
    });
  
    // Simulated incoming messages (replace with backend later)
    setTimeout(() => addMessage("msg001", "Patient in Room 5 is in pain."), 2000);
    setTimeout(() => addMessage("msg002", "Patient in Room 2 requested water."), 5000);
  });
  