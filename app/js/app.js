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

    // Load lyrics from localStorage if there is anything
    if (localStorage['lyrics']) {
        this.lyrics = Lyrics.fromJSON(localStorage['lyrics'], audio.duration);
        lyricsBox.setLyrics(this.lyrics);
        $('#introduction').hide();
        $('#lyrics').show();
    }
}


ELRCMaker.prototype._setupUI = function() {
    var audio = this.audio, lyrics = this.lyrics, lyricsBox = this.lyricsBox,
        this$App = this;

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
        if (lyrics.length) {
            $('#import textarea').val(
                    $.map(lyrics, function(i) {return i.text}).join(' '));
        }
        $('#import').modal();
    });
    $('.export').click(function() {
        $('#export textarea').val(lyrics.toELRC());
        $('#export').modal();
    });
    $('.export').on('dragstart', function(e) {
        // Allow drag&drop from export button to desktop
        e.originalEvent.dataTransfer.setData("DownloadURL",
            "application/octet-stream:"+(this$App.loadedFilename || 'export')+
                    ".lrc:data:application/octet-stream," +
                    encodeURIComponent(lyrics.toELRC()));
    });
    $('.show-help').click(function() { $('#help').modal(); });
    $('#help .button').click(function() { $('#help').modal('hide'); });
    $('.save').click(function() {
        localStorage['lyrics'] = JSON.stringify(lyrics);
    });

    // The load-text dialog.
    $('#import .button').on('click', function() {
        var text = $('#import textarea').val();

        // Support a special JSON format that only I am using.
        var json;
        try {
            json = jQuery.parseJSON(text);
        }
        catch (e) {}
        if (json) {
            if (json.text)
                text = cleanText(json.text);
            if (json.audio)
                this$App.loadAudio(json.audio);
        }

        this$App.lyrics = Lyrics.fromText(text, audio.duration);
        lyricsBox.setLyrics(this$App.lyrics);

        // Store in local storage, so it won't be lost in reload
        localStorage['lyrics'] = JSON.stringify(this$App.lyrics);

        // Hide introduction, show, show lyrics
        $('#introduction').slideUp();
        $('#lyrics').slideDown();

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
                    $('#import textarea').val(e.target.result);
                    $('#import').modal();
                };
                fileReader.readAsText(data.files[i]);
            }
        }
        return false;
    });
}


ELRCMaker.prototype.loadAudio = function(url, filename) {
    this.audio.src = url;
    this.loadedFilename = filename;
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