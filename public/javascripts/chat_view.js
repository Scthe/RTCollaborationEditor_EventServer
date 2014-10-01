$(document).ready(function () {

  var message_input = $('#message-input');
  var jumbotron = $('#message-list-empty');
  var message_area = $('#message-list');
  var message_template = $("#template-message").html();
  message_template = _.template(message_template);

  function send_message(msg) {
    console.log(msg);

    var html = message_template({ 'username': 'John Smith', 'text': msg });
    message_area.prepend(html);
//    message_area.scrollTop(message_area.prop("scrollHeight"));

    message_input.val('');
    jumbotron.hide();
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