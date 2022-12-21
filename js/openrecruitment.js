// JavaScript Document

$(function(){
  var division = [
  	'Acara',
    'Donaturial',
    'Entrepreneur',
    'Sponsorship',
    'Perizinan',
//    'Manajemen Ta\'dib',
//    'Kekeluargaan',
    'Kewilayahan (diutamakan Akhwat)',
    'Artistik',
    'Dokumentasi',
//    'Grafis',
    'Publikasi',
//    'MSDM Panitia',
//    'MSDM Peserta',
    'Akomodasi dan Konsumsi',
    'Logistik'
  ];
	
  $(window).scroll(function() {
    if ($(window).scrollTop() > 100) {
        $('.main_h').addClass('sticky');
    } else {
        $('.main_h').removeClass('sticky');
    }
  });

  var divisionItemTemplate=
    '<div class="col s12 division-item">'
    + '<div class="panel panel-default">'
    + '<div class="panel-heading"><span></span></div></div></div>';

  var divisionItemPlaceholder=
    '<div class="col s12 division-item division-item-placeholder">'
    + '<div class="panel panel-default">'
    + '<div class="panel-heading"><span></span></div></div></div>';

  $('.datepicker').pickadate({
  	format:'dd/mm/yyyy',
	  today: '',
	  close: 'Set',
	  selectYears:60,
	  selectMonths:true
  });

  var isShuffled=false;

  function initializePool() {
        var pool = $('.division-pool');
        pool.html('');
        for (i = 0; i < division.length; ++i) {
            var newDivisionItem = $($.parseHTML(divisionItemTemplate));
            newDivisionItem.data('division', division[i]);
            pool.append(newDivisionItem);
        }
        // append clear to make the well works
        pool.append('<div class="clear"></div>');
    }
	
  $('.modal').modal({
	  dismissible:false,
	  
  });

  initializePool();

  /* Credit to Joshua Atmadja */
   function shuffle(){
        for(i = 1;i <= 100; ++i){
            var x = Math.floor(Math.random() * i) % division.length;
            var y = Math.floor(Math.random() * (i + 1)) % division.length;
            var temp = division[x];
            division[x] = division[y];
            division[y] = temp;
        }
        initializePool();
        reorderDivisionItem();
        isShuffled = true;
    }

    // initially, shuffle the options
    shuffle();

 function reorderDivisionItem(ui) {
        // reorder the numbering
        $('.division-item:not(.ui-sortable-helper)').each(function(i, e) {
            // convert into jQuery object
            e = $(e);
            if (e.hasClass('division-item-placeholder')) {
                e = ui.helper;
            }
            var name = e.data('division');
            e.find('span').html('' + (i + 1) + '. ' + name);

            // bold the top three, replace them in text
            e.removeClass('division-item-top');
            if (i < 3) {
                e.addClass('division-item-top');
                $('.division-' + (i + 1)).html(name);
            }
        });
    }
    reorderDivisionItem();

    $('.division-pool').sortable({
        cursor: 'move',
        items: '.division-item',
        opacity: 0.8,
        update: function (event, ui) {
            reorderDivisionItem();
            isShuffled = false;
        },
        sort: function (event, ui) {
            reorderDivisionItem(ui);
        },
        placeholder: {
            element: function(clone, ui) {
                return $(divisionItemPlaceholder);
            },
            update: function() {}
        },
        revert: 300
    });

  function validate(){
    var valid = true;
    var parent = $('#belum-diisi');
    parent.html('<ol></ol>');

    if ($('#name').val() == ""){
      parent.find('ol').append('<li>Nama lengkap Anda</li>');
      valid = false;
    }
    
    var section_list = ["A", "B", "C", "D", "E", "F", "G"];
    var max_question = 8;
    for (var idx = 0; idx < section_list.length; ++idx) {
      var score = 0;
      var section = section_list[idx];
      for (var i = 1; i <= 8; ++i) {
        console.log(section + i);
        console.log($('#' + section + i).val());
        score += $('#' + section + i).val() ? +$('#' + section + i).val() : 0;
      }
      console.log("Score: " + score);
      if (score < 10) {
        parent.find('ol').append('<li>Score untuk Section ' + section + ': <b>' + score + '</b>, kurang dari 10');
        valid = false;
      } else if (score > 10) {
        parent.find('ol').append('<li>Score untuk Section ' + section + ': <b>' + score + '</b>, lebih dari 10');
        valid = false;
      }
    }
    return valid;
  }
	
  $('.submit-button').click(function(){
    if(validate()){
  	  fillModal();
  	  $('#review-modal').modal('open');
    }
    else
      $('#error-modal').modal('open');
  });
	
  $('#reset-button').click(function(){
	  $('#review-modal').modal('close');
  });
	
   $('#reset-button-2').click(function(){
    $('#error-modal').modal('close');
  });

  function getListScoreSection(section) {
    var res = []
    for (var i = 1; i <= 8; ++i) {
      console.log(section + i);
      var score = $('#' + section + i).val() ? +$('#' + section + i).val() : 0;
      res.push(score);
    }
    return "<b>" + res.join("</b> <b>") + "</b>";
  }

  function fillModal(){
	  $('#nama-review').html($('#name').val());
	  $('#A-review').html(getListScoreSection("A"));
	  $('#B-review').html(getListScoreSection("B"));
	  $('#C-review').html(getListScoreSection("C"));
	  $('#D-review').html(getListScoreSection("D"));
	  $('#E-review').html(getListScoreSection("E"));
	  $('#F-review').html(getListScoreSection("F"));
	  $('#G-review').html(getListScoreSection("G"));
  }

  var formKey = "e/1FAIpQLSciy2r_VurxAEwt4E85w78wKVsyAGZw6Q_q4qWdAzuwx63xpA/";
	
  var formEntries = {
    "A1": "entry.1778366916",
    "name": "entry.1975963692",
    "A2": "entry.1418472055",
    "A3": "entry.1024909619",
    "A4": "entry.255002219",
    "A5": "entry.942908907",
    "A6": "entry.817602717",
    "A7": "entry.1650556991",
    "A8": "entry.185263933",
    "B1": "entry.759877824",
    "B2": "entry.1435686232",
    "B3": "entry.548528679",
    "B4": "entry.2060920636",
    "B5": "entry.1392057975",
    "B6": "entry.342309999",
    "B7": "entry.302659101",
    "B8": "entry.1281005961",
    "C1": "entry.1751787781",
    "C2": "entry.48679744",
    "C3": "entry.497638032",
    "C4": "entry.13064540",
    "C5": "entry.1680327567",
    "C6": "entry.1761396628",
    "C7": "entry.1088765947",
    "C8": "entry.1808156798",
    "D1": "entry.1990179209",
    "D2": "entry.1691527555",
    "D3": "entry.541001859",
    "D4": "entry.1561557561",
    "D5": "entry.333794508",
    "D6": "entry.1094565585",
    "D7": "entry.205152427",
    "D8": "entry.120307793",
    "E1": "entry.223781543",
    "E2": "entry.1861090426",
    "E3": "entry.1969054117",
    "E4": "entry.699836340",
    "E5": "entry.532762342",
    "E7": "entry.1954639626",
    "E8": "entry.1761069643",
    "F1": "entry.539108166",
    "F2": "entry.1725595889",
    "F3": "entry.1022557710",
    "F4": "entry.1313764635",
    "F5": "entry.771266627",
    "F6": "entry.346873762",
    "F7": "entry.1418716032",
    "F8": "entry.299159632",
    "G1": "entry.51236173",
    "G2": "entry.474434772",
    "G3": "entry.1807897112",
    "G4": "entry.129262199",
    "G5": "entry.1713197879",
    "G6": "entry.291123150",
    "G7": "entry.1615824858",
    "G8": "entry.107041403"
};

  $('#real-submit-button').click(function(){
	  var url = "https://docs.google.com/forms/d/e/1FAIpQLScy_1X1kJJ0nO6AZLdiHb71zUb6N_tHMdtmxxbN3VIDMAQU3A/formResponse";
    
    var form = $('#main-form');
    form.attr('action', url);
    form.html('');
    
    for (const [key, value] of Object.entries(formEntries)) {
      console.log("form id: " + value);
      console.log("entry key: " + key);
      console.log("value to be sent: " + $('#' + key).val() ? +$('#' + key).val() : 0);
      if (key != "name") {
        var raw_val = $('#' + key).val() ? +$('#' + key).val() : 0;
        form.append('<input type="text" name="' + value + '" value="' + raw_val + '">');
      } else {
        form.append('<input type="text" name="' + value + '" value="' + $('#' + key).val() + '">');
      }
    }
    
    window.alert("sometext");

    form.submit();    
  });
  
  particlesJS("particles-js",{
    "particles": {
      "number": {
        "value": 100,
        "density": {
          "enable": true,
          "value_area": 800
        }
      },
      "color": {
        "value": "#1e00ff"
      },
      "shape": {
        "type": "circle",
        "stroke": {
          "width": 0,
          "color": "#000000"
        },
        "polygon": {
          "nb_sides": 5
        },
        "image": {
          "src": "img/github.svg",
          "width": 100,
          "height": 100
        }
      },
      "opacity": {
        "value": 0,
        "random": false,
        "anim": {
          "enable": false,
          "speed": 1,
          "opacity_min": 0.1,
          "sync": false
        }
      },
      "size": {
        "value": 2,
        "random": false,
        "anim": {
          "enable": false,
          "speed": 40,
          "size_min": 0.1,
          "sync": false
        }
      },
      "line_linked": {
        "enable": true,
        "distance": 125,
        "color": "#004dbb",
        "opacity": 0.5,
        "width": 1
      },
      "move": {
        "enable": true,
        "speed": 3,
        "direction": "top-right",
        "random": false,
        "straight": false,
        "out_mode": "out",
        "bounce": false,
        "attract": {
          "enable": true,
          "rotateX": 600,
          "rotateY": 1200
        }
      }
    },
    "interactivity": {
      "detect_on": "window",
      "events": {
        "onhover": {
          "enable": true,
          "mode": "grab"
        },
        "onclick": {
          "enable": true,
          "mode": "push"
        },
        "resize": true
      },
      "modes": {
        "grab": {
          "distance": 180,
          "line_linked": {
            "opacity": 0.5
          }
        },
        "bubble": {
          "distance": 400,
          "size": 40,
          "duration": 2,
          "opacity": 8,
          "speed": 3
        },
        "repulse": {
          "distance": 200,
          "duration": 0.4
        },
        "push": {
          "particles_nb": 4
        },
        "remove": {
          "particles_nb": 2
        }
      }
    },
    "retina_detect": true
  });
});