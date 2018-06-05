// JavaScript Document

$(function(){
  $('.datepicker').pickadate({
    format:'dd/mm/yyyy',
    today: '',
    close: 'Set',
    selectYears:60,
    selectMonths:true
  });

  $('.modal').modal({
    dismissible:false,
  });

  $('#penjurusan').on("change", function(){
    if ($(this).val() == 'Ya'){
      $('[id=nim-jurusan-holder]').show();
    } else {
      $('[id=nim-jurusan-holder]').hide();
    }
  });

  var oke = false;
  $('#perbaikan').on("change", function(){
    if ($(this).val() == 'Belum'){
      $('[id=tempatLahir]').show();
      $('[id=tanggalLahir]').show();
      $('[id=nomorTelepon]').show();
      $('[id=email]').show();
      $('[id=alamat-asal]').show();
      $('[id=alamat]').show();
      $('[id=idLine]').show();
      $('[id=labeltempatLahir]').show();
      $('[id=labeltanggalLahir]').show();
      $('[id=labelnomorTelepon]').show();
      $('[id=labelemail]').show();
      $('[id=labelalamat-asal]').show();
      $('[id=labelalamat]').show();
      $('[id=labelidLine]').show();
      oke = false;
    } else {
      $('[id=tempatLahir]').hide();
      $('[id=tanggalLahir]').hide();
      $('[id=nomorTelepon]').hide();
      $('[id=email]').hide();
      $('[id=alamat-asal]').hide();
      $('[id=alamat]').hide();
      $('[id=idLine]').hide();
      $('[id=labeltempatLahir]').hide();
      $('[id=labeltanggalLahir]').hide();
      $('[id=labelnomorTelepon]').hide();
      $('[id=labelemail]').hide();
      $('[id=labelalamat-asal]').hide();
      $('[id=labelalamat]').hide();
      $('[id=labelidLine]').hide();
      oke = true;
    }
  });

  function validate(){
    var valid = true;
    var parent = $('#belum-diisi');
    parent.html('<ol></ol>');

    if ($('#name').val() == ""){
      parent.find('ol').append('<li>Nama lengkap Anda</li>');
      valid = false;
    }
    if ($('#nim-tpb').val() == ""){
      parent.find('ol').append('<li>NIM Anda</li>');
      valid = false;
    }
    if (!oke){
      if ($('#tempatLahir').val() == "" || $('#tanggalLahir').val() == ""){
        parent.find('ol').append('<li>Tempat tanggal lahir Anda</li>');
        valid = false;
      }
      if ($('#nomorTelepon').val() == "" || ($('#nomorTelepon').val())[0] != "'"){
        parent.find('ol').append('<li>Nomor telepon Anda</li>');
        valid = false;
      }
      if ($('#email').val() == ""){
        parent.find('ol').append('<li>Alamat email Anda</li>');
        valid = false;
      }
      if ($('#idLine').val() == ""){
        parent.find('ol').append('<li>ID Line Anda</li>');
        valid = false;
      }
      if ($('#alamat-asal').val() == ""){
        parent.find('ol').append('<li>Alamat asal Anda</li>');
        valid = false;
      }
      if ($('#alamat').val() == ""){
        parent.find('ol').append('<li>Alamat tinggal Anda di Bandung</li>');
        valid = false;
      }
    }
    if ($('#penjurusan option:selected').val()=="Ya" && !$('#nim-jurusan').val()) {
      parent.find('ol').append('<li>NIM Jurusan Anda</li>');
      valid = false;
    }

    if(!$('#agree').is(':checked')){
      parent.append('<span>... dan Anda belum menyetujui pernyataan akhirnya .___.</span>');
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
    $('#nim-tpb-review').html($('#nim-tpb').val());
    if (!oke){
      $('#ttl-review').html($('#tempatLahir').val()+", "+$('#tanggalLahir').val());
      $('#telp-review').html($('#nomorTelepon').val().substring(1,$('#nomorTelepon').val().length-1));
      $('#email-review').html($("#email").val());
      $('#line-review').html($('#idLine').val());
      $('#alamat-review').html($("#alamat").val());
      $('#alamat-asal-review').html($("#alamat-asal").val());
    } else {
      $('#ttl-review').html('-');
      $('#telp-review').html('-');
      $('#email-review').html('-');
      $('#line-review').html('-');
      $('#alamat-review').html('-');
      $('#alamat-asal-review').html('-');
    }
    $('#penjurusan-review').html($("#penjurusan option:selected").val());
    $('#jenis-kelamin-review').html($("#jenis-kelamin option:selected").val());
    if ($("#penjurusan option:selected").val() == "Ya"){
      $('#nim-jurusan-review').html($('#nim-jurusan').val());
    } else {
      $('#nim-jurusan-review').html('-');
    }
  }

  var formKey = "e/1FAIpQLSe3hK4RtnSn3P0Rf0mCKQau9kIJp7KdNCBngRotw1m06uv-Dw/";
  
  var formEntries = {
    nama: "entry.633697902",
    nimtpb: "entry.168282345",
    jeniskelamin: "entry.1852376069",
    nimjurusan: "entry.1251021489",
    tempatlahir: "entry.369694499",
    tanggallahir: "entry.1451209677",
    notelp: "entry.364470725",
    email: "entry.229759792",
    alamatasal: "entry.861293366",
    alamat: "entry.1188233797",
    idline: "entry.1441426335",
  };

  $('#real-submit-button').click(function(){
    var url = "https://docs.google.com/a/std.stei.itb.ac.id/forms/d/e/1FAIpQLSe3hK4RtnSn3P0Rf0mCKQau9kIJp7KdNCBngRotw1m06uv-Dw/formResponse";
    
    var form = $('#main-form');
    form.attr('action', url);
    form.html('');
    var tmp;
    
    form.append('<input type="text" name="' + formEntries.nimtpb + '" value="' + $('#nim-tpb').val() + '">');
    form.append('<input type="text" name="' + formEntries.nama + '" value="' + $('#name').val() + '">');
    form.append('<input type="text" name="' + formEntries.jeniskelamin + '" value="' + $('#jenis-kelamin').val() + '">');
    form.append('<input type="text" name="' + formEntries.tempatlahir + '" value="' + $('#tempatLahir').val() + '">');
    form.append('<input type="text" name="' + formEntries.tanggallahir + '" value="' + $('#tanggalLahir').val() + '">');
    form.append('<input type="text" name="' + formEntries.notelp + '" value="' + $('#nomorTelepon').val() + '">');
    form.append('<input type="text" name="' + formEntries.email + '" value="' + $('#email').val() + '">');
    form.append('<input type="text" name="' + formEntries.alamat + '" value="' + $('#alamat').val() + '">');
    form.append('<input type="text" name="' + formEntries.alamatasal + '" value="' + $('#alamat-asal').val() + '">');
    form.append('<input type="text" name="' + formEntries.idline + '" value="' + $('#idLine').val() + '">');
    form.append('<input type="text" name="' + formEntries.nimjurusan + '" value="' + $('#nim-jurusan').val() + '">');
    form.submit();    
    console.log("Data berhasil terkirim");
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