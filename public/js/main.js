$(document).ready(function() {
	
	// expand hike on click to show description
	$('.hike').on('click', function() {
	  return $(this).toggleClass('open');
	});

	$('main [type=submit]').on('click', function() {
		event.preventDefault();
	  $('main').addClass('searching');
	});

});
