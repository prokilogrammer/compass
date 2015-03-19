$(document).ready(function() {

	// animation to search for hikes
	$('main [type=submit]').on('click', function() {
		event.preventDefault();
	  $('main').addClass('searching');
	});

	// back button to search again
	$('#back').on('click', function() {
	  $('main').removeClass('searching');
	});

	// expand hike on click to show description
	$('.hike').on('click', function() {

		// do not open if its already open
		if ( $(this).hasClass('open')) {
			return false;
		}

		// collapse other hikes
		$('.hike').removeClass('open');
		$('.hike .content').slideUp(500);

		// show clicked hike
		$('.content', this).slideDown(500);
		$(this).addClass('open');

		// // scroll to clicked hike
		// $('html, body').animate({
	 //        scrollTop: $(".hike.open").offset().top - 48
	 //    }, 1000);

	});

});
