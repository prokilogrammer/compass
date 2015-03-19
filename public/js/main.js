$(document).ready(function() {

	// search for hikes
	$('main [type=submit]').on('click', function() {
		event.preventDefault();

		// animate main screen
		$('main').addClass('searching');

		// get values from form
		var difficulty = $('#search [name=difficulty]:checked').val();
		var drivingDuration = $('#search [name=drivingDuration]:checked').val();
		var length = $('#search [name=length]:checked').val();
		var elevGain = $('#search [name=elevGain]:checked').val();

		// AJAX results into #search-results container
		$.get('/search-results', {
			difficulty: difficulty,
			drivingDuration: drivingDuration,
			length: length,
			elevGain: elevGain
		}, function(data, textStatus, xhr) {

			$('#search-results').append(data);

		});

	});

	// sort hikes
	$('#sort').on('click', function() {
		$('nav').toggleClass('sorting');
		$('li', this).removeClass('active');
	});


	// back button to search again
	$('#back').on('click', function() {

		$('main').removeClass('searching');

		// remove current searches from dom
		setTimeout(function() {
			$('#search-results').empty();
		}, 750); // same time as main transition on css

	});

	// expand hike on click to show description
	$('#search-results').on('click', '.hike', function() {

		// do not open if its already open
		if ( $(this).hasClass('open')) {
			$(this).removeClass('open');
			$('.content', this).slideUp(250);
		}

		else {

			// collapse other hikes
			$('.hike').removeClass('open');

			// show clicked hike
			$('.content', this).slideDown(500);
			$(this).addClass('open');

		}

		// scroll to clicked hike
		$('html, body').animate({
	        scrollTop: $(".hike.open").offset().top - 48
	    }, 1000);

	});

});
