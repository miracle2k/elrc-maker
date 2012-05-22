/**
 * Wraps the main app functionality (GUI etc).
 *
 * Expects certain IDs and classes to be available in the document.
 *
 * @constructor
 */
ELRCMaker = function() {
    // Currently loaded Audio/Lyrics
    this.lyrics = new Lyrics();
    var audio = this.audio = $('audio')[0];
    var lyricsBox = this.lyricsBox = new LyricsBox('#lyrics', audio);
    this.loadedFilename = null;

    self = this;

    // The Lyrics object needs the duration, not available right away.
    $(audio).on('durationchange loadedmetadata',
        function() {
            self.lyrics.duration = audio.duration;
        });

    // Install all the UI handlers etc.
    this._setupUI();

    // Enable keyboard shortcuts
    this.shortcuts = Shortcuts(this);

    // Load data from localStorage if there is anything
    if (localStorage['lyrics']) {
        this.lyrics = Lyrics.fromJSON(localStorage['lyrics'], audio.duration);
        lyricsBox.setLyrics(this.lyrics);
        $('#introduction').hide();
        $('#lyrics').show();
    }
    if (localStorage['audio']) {
        this.loadAudio(localStorage['audio'], localStorage['audioFilename']);
    }
}


ELRCMaker.prototype._setupUI = function() {
    // Be sure not to cache ``lyrics``, the object can change.
    var this$App = this, audio = this.audio;

    $('.faster').click(function() { this$App.setPlaybackRate('+0.1'); });
    $('.slower').click(function() { this$App.setPlaybackRate('-0.1'); });
    this.setPlaybackRate(1.0);

    // Setup position display
    function updatePosition() {
        var text;
        if (audio.readyState == audio.HAVE_NOTHING)
            text = Lyrics.toTimer(undefined) + ' / ' +
                   Lyrics.toTimer(undefined);
        else
            text = Lyrics.toTimer(audio.currentTime) + ' / ' +
                   Lyrics.toTimer(audio.duration)
        $('.position').text(text);
    }
    audio.addEventListener('timeupdate', updatePosition);
    audio.addEventListener('loadedmetadata', updatePosition);
    updatePosition();

    // Setup toolbar buttons
    $('.import-lyrics').click(function() {
        // If lyrics are currently loaded, add them to the import dialog
        // to allow editing them (albeit with loss of timestamps set).
        // Note: Keeping the text originally imported is not good enough,
        // because it might be a format like JSON, ELRC...
        if (this$App.lyrics.length) {
            $('#import textarea').val(
                    $.map(this$App.lyrics,
                          function(i) {return i.text}).join(' '));
        }
        $('#import').modal();
    });
    $('.export').click(function() {
        $('#export textarea').val(this$App.lyrics.toELRC());
        $('#export').modal();
    });
    $('.export').on('dragstart', function(e) {
        // Allow drag&drop from export button to desktop
        e.originalEvent.dataTransfer.setData("DownloadURL",
            "application/octet-stream:"+(this$App.loadedFilename || 'export')+
                    ".lrc:data:application/octet-stream," +
                    encodeURIComponent(this$App.lyrics.toELRC()));
    });
    $('.show-help').click(function() { $('#help').modal(); });
    $('#help .button').click(function() { $('#help').modal('hide'); });
    $('.save').click(function() {
        localStorage['lyrics'] = JSON.stringify(this$App.lyrics);
    });

    // The load-text dialog.
    $('#import .button').on('click', function() {
        var text = $('#import textarea').val();
        this$App.loadLyrics(text);

        // Close dialog
        $('#import').modal('hide');
    });

    // Enable drag&drop of audio files
    $(document).on('dragenter dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
    });
    $(document).on('drop', function (event) {
        // originalEvent required, dataTransfer not in jQuery.event.props
        var data = event.originalEvent.dataTransfer;

        var audioFound, textFound = false;
        for (var i = 0; i < data.files.length; i++) {
            var fileReader = new FileReader();
            if (data.files[i].type.indexOf('audio/') == 0) {
                // Only load the first audio file
                if (audioFound) continue;
                audioFound = true;

                var theFilename = data.files[i].fileName;
                fileReader.onload = function(e) {
                    this$App.loadAudio(e.target.result, theFilename);
                };
                fileReader.readAsDataURL(data.files[i]);
            }
            // Assume a text file
            else {
                // Only load the first text file
                if (textFound) continue;
                textFound = true;

                fileReader.onload = function(e) {
                    var text = e.target.result;
                    // Support a special JSON format that only I am using.
                    var json;
                    try {
                        json = jQuery.parseJSON(text);
                    }
                    catch (e) {}

                    // If this is JSON, load directly.
                    if (json) {
                        if (json.text)
                            this$App.loadLyrics(cleanText(json.text));
                        // Only load the audio if nothing was drag&dropped
                        // in at the same time.
                        if (json.audio && !audioFound) {
                            this$App.loadAudio(json.audio);
                        }
                    }

                    // Otherwise, show import dialog
                    else {
                        $('#import textarea').val(text);
                        $('#import').modal();
                    }


                };
                fileReader.readAsText(data.files[i]);
            }
        }
        return false;
    });
}

/**
 * Load the given audio url.
 *
 * @param url
 * @param filename Optional, used as a default export filename, for example.
 * @param initial Set if this is a load from localStorage, so it won't be
 *    written back there right away (since a data url can be large).
 */
ELRCMaker.prototype.loadAudio = function(url, filename, initial) {
    this.audio.src = url;
    this.loadedFilename = filename;

    // Store in local storage, so it won't be lost in reload
    if (!initial) {
        localStorage['audio'] = url;
        localStorage['audioFilename'] = filename;
    }
}

/**
 * Load the given lyrics.
 *
 * @param text
 */
ELRCMaker.prototype.loadLyrics = function(text) {
    this.lyrics = Lyrics.fromText(text, this.audio.duration);
    this.lyricsBox.setLyrics(this.lyrics);

    // Store in local storage, so it won't be lost in reload
    localStorage['lyrics'] = JSON.stringify(this.lyrics);

    // Hide introduction, show, show lyrics
    $('#introduction').slideUp();
    $('#lyrics').slideDown();
}



ELRCMaker.prototype.setPlaybackRate = function(rate) {
    var newRate = this.audio.playbackRate;
    if (rate.constructor == Number)
        newRate = rate;
    else
        newRate += parseFloat(rate);
    newRate = Math.min(Math.max(newRate, 0.5), 4.0);
    this.audio.playbackRate = newRate;
    $('#controls .speed').text(newRate.toFixed(3));
}