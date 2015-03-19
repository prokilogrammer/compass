$(document).ready(function() {

	// search for hikes
	$('main [type=submit]').on('click', function() {
		event.preventDefault();
	  $('main').addClass('searching');

	  var difficulty = $('#search [name=difficulty]:checked').val();
	  var drivingDuration = $('#search [name=drivingDuration]:checked').val();
	  var length = $('#search [name=length]:checked').val();
	  var elevGain = $('#search [name=elevGain]:checked').val();

	  $.get('/search-results', {
	  	difficulty: difficulty,
	  	drivingDuration: drivingDuration,
	  	length: length,
	  	elevGain: elevGain
	  }, function(data, textStatus, xhr) {

	  	$('#search-results').append(data);

	  });
	  

	});

	// back button to search again
	$('#back').on('click', function() {
	  $('main').removeClass('searching');
	  $('#search-results').empty();
	});

	// expand hike on click to show description
	$('#search-results').on('click', '.hike', function() {

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
