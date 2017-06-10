// JavaScript Document

$(function(){
  var division = [
    'Acara',
    'Fundraising',
    'Humas dan Perizinan',
    'Internal',
    'Kewilayahan',
    'Kreatif',
    'Manajemen Sumber Daya Anggota'
    'Materi dan Metode',
    'Operasional',
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
    
    if ($('#nim').val() == "" || ($('#nim').val()[0] != '1' || $('#nim').val().length != 8)){
      parent.find('ol').append('<li>NIM Anda</li>');
      valid = false;
    }

    if ($('#tempatLahir').val() == "" || $('#tanggalLahir').val() == ""){
      parent.find('ol').append('<li>Tempat tanggal lahir Anda</li>');
      valid = false;
    }
    
    if ($('#nomorTelepon').val() == "" || ($('#nomorTelepon').val()[0] != '\'') ){
      parent.find('ol').append('<li>Nomor telepon Anda</li>');
      valid = false;
    }
    if($('#email').val() == ""){
      parent.find('ol').append('<li>Alamat email Anda</li>');
      valid = false;
    }
    if($('#idLine').val() == ""){
      parent.find('ol').append('<li>ID Line Anda</li>');
      valid = false;
    }
    if(($('#noDarurat').val() == "") || ($('#pihakDarurat').val() == "") || ($('#noDarurat').val()[0] != '\'') ){
      parent.find('ol').append('<li>Kontak darurat</li>');
      valid = false;
    }
    if($('#alamat').val()==""){
      parent.find('ol').append('<li>Alamat tinggal Anda di Bandung</li>');
      valid = false;
    }
    if($('#kendaraan').val()==""){
      parent.find('ol').append('<li>Kendaraan yang Anda miliki</li>');
      valid = false;
    }
    if($('#keahlian').val()==""){
      parent.find('ol').append('<li>Keahlian Anda</li>');
      valid = false;
    }
    if($('#organisasi').val()==""){
      parent.find('ol').append('<li>Pengalaman organisasi Anda</li>');
      valid = false;
    }
    if($('#kepanitiaan').val()==""){
      parent.find('ol').append('<li>Pengalaman kepanitiaan Anda</li>');
      valid = false;
    }
    if($('#kesibukan').val()==""){
      parent.find('ol').append('<li>Kesibukan Anda setahun mendatang</li>');
      valid = false;
    }


    var reasonfilled=true;
    for (var i = 1; i <= 3; ++i) {
            if($('#reason' + i).val()==""){
              valid=false;
              reasonfilled=false;
            };
    }
    if(!reasonfilled) parent.find('ol').append('<li>Alasan masuk divisi pilihan Anda</li>');

    if(!$('#agree').is(':checked')){
      parent.append('<span>...dan Anda belum menyetujui pernyataan akhirnya</span>');
      valid = false;
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

  function fillModal(){
	  $('#nama-review').html($('#name').val());
	  $('#nim-review').html($('#nim').val());
	  $('#ttl-review').html($('#tempatLahir').val()+", "+$('#tanggalLahir').val());
	  $('#telp-review').html($('#nomorTelepon').val());
	  $('#email-review').html($("#email").val());
	  $('#line-review').html($('#idLine').val());
	  $('#emergency-review').html($('#noDarurat').val()+" ("+$('#pihakDarurat').val()+")");
	  $('#alamat-review').html($("#alamat").val());
	  $('#kendaraan-review').html($("#kendaraan").val());
	  $('#keahlian-review').html($("#keahlian").val());
	  $('#organisasi-review').html($("#organisasi").val());
	  $('#kepanitiaan-review').html($("#kepanitiaan").val());
	  $('#kesibukan-review').html($("#kesibukan").val());
	  
	  //MBTI
	  //talentoday.com
	  
	  //division
	  var order = $('#division-review');
        order.html('<ol></ol>');
        $('.division-item').each(function(i, e) {
            order.find('ol').append('<li>' + $(e).data('division') + '</li>');
        });
	  
	  //reasons
	  for (var i = 1; i <= 3; ++i) {
            $('#reason' + i + '-review').html('<em>'+$('#reason' + i).val()+'</em>');
        }
  }

  var formKey = "e/1FAIpQLSeqprEkjYE1oS5Wpi_sNvtZOD_tc1J-yPEZRjp3w411le5r2Q";
	
  var formEntries = {
	  nama: "entry.1988027640", //done
	  nim: "entry.994926422", //done
	  tempatlahir: "entry.2012187542", //done
	  tanggallahir: "entry.609900518", //done
	  notelp: "entry.1899955254", //done
	  notelpdarurat: "entry.227148534", //done
	  pemilikdarurat: "entry.2106897865", //done
	  email: "entry.82887629", //done
	  alamat: "entry.1761637625", //done
	  idline: "entry.1047972670", //done
	  kendaraan: "entry.736347967", //done
	  keahlian: "entry.1103552589", //done
	  organisasi: "entry.249067437", //done
	  kepanitiaan: "entry.665222541", //done
	  kesibukan: "entry.1056663973", //done
	  
	  divisi:[
		"entry.569840745",    //Pilihan 1
		"entry.1626400103",   //Pilihan 2
		"entry.1335677820"    //Pilihan 3
		// "entry.141231101",//4
		// "entry.1918773200",
		// "entry.1139148372",
		// "entry.1422858740",
		// "entry.412468260",//8
		// "entry.1041488826",
		// "entry.101889886",
		// "entry.1776833333"
	  ],
	  
	  alasan:[
		"entry.890713090",    //Alasan 1
		"entry.1831067473",   //Alasan 2
		"entry.1637086199"    //Alasan 3
	  ],		
  };

  $('#real-submit-button').click(function(){
	  var url = "https://docs.google.com/a/std.stei.itb.ac.id/forms/d/e/1FAIpQLSciy2r_VurxAEwt4E85w78wKVsyAGZw6Q_q4qWdAzuwx63xpA/formResponse";
    
    var form = $('#main-form');
    form.attr('action', url);
    form.html('');
    
    form.append('<input type="text" name="' + formEntries.nim + '" value="' + $('#nim').val() + '">');
      form.append('<input type="text" name="' + formEntries.nama + '" value="' + $('#name').val() + '">');
      form.append('<input type="text" name="' + formEntries.tempatlahir + '" value="' + $('#tempatLahir').val() + '">');
      form.append('<input type="text" name="' + formEntries.tanggallahir + '" value="' + $('#tanggalLahir').val() + '">');
      form.append('<input type="text" name="' + formEntries.notelp + '" value="&#39;' + $('#nomorTelepon').val() + '">');
      form.append('<input type="text" name="' + formEntries.notelpdarurat + '" value="&#39;' + $('#noDarurat').val() + '">');
      form.append('<input type="text" name="' + formEntries.pemilikdarurat + '" value="' + $('#pihakDarurat').val() + '">');
      form.append('<input type="text" name="' + formEntries.email + '" value="' + $('#email').val() + '">');
      form.append('<input type="text" name="' + formEntries.alamat + '" value="' + $('#alamat').val() + '">');
      form.append('<input type="text" name="' + formEntries.idline + '" value="' + $('#idLine').val() + '">');
      form.append('<input type="text" name="' + formEntries.kendaraan + '" value="' + $('#kendaraan').val() + '">');
      form.append('<input type="text" name="' + formEntries.keahlian + '" value="' + $('#keahlian').val() + '">');
      form.append('<input type="text" name="' + formEntries.organisasi + '" value="' + $('#organisasi').val() + '">');
      form.append('<input type="text" name="' + formEntries.kepanitiaan + '" value="' + $('#kepanitiaan').val() + '">');
      form.append('<input type="text" name="' + formEntries.kesibukan + '" value="' + $('#kesibukan').val() + '">');
    
      $('.division-item').each(function(i, e) {
            if(i<3) form.append('<input type="text" name="' + formEntries.divisi[i] + '" value="' + $(e).data('division') + '">');
      });

      for (i = 1; i <= 3; ++i) {
            form.append('<input type="text" name="' + formEntries.alasan[i-1] + '" value="' + $('#reason' + i).val() + '">');
      }
      form.submit();    
      console.log("5");
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