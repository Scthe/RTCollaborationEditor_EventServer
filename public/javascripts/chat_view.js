$(document).ready(function () {

  var message_input = $('#message-input');
  var message_area = $('.jumbotron');

  function send_message(msg) {
    console.log(msg);
    message_input.val('');
    message_area.hide();
  }

  // chat screen
  message_input.keydown(function (e) {
    if (e.keyCode === 13) {
      var msg = $('#message-input').val().trim();
      send_message(msg);
      e.preventDefault();
    }
  });
});