function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function () {
    return 'AssertException: ' + this.message;
}

function assert(exp, message) {
    if (!exp) {
        throw new AssertException(message);
    }
}


/**
 * This represents a lyrics file - a sequence of words with timestamps
 * attached.
 *
 * @param duration The maximum timestamp. This is used to approximate
 *   timestamps if a word is not timed. Can also be set later (e.g.
 *   ondurationchange event).
 * @constructor
 */
Lyrics = function(duration) {
    this.duration = duration;

}
Lyrics.prototype = new Array();

/**
 * Return the word index for the given timestamp.
 *
 * This is done in a way such that when a word is not timed, an implicit
 * timestamp is assumed based on earlier and later words which are timed.
 */
Lyrics.prototype.getIndexForTime = function(timestamp)
{
    // Without a duration, we cannot handle untimed words. Maybe instead
    // of an assert, we could gracefully degrade to support only timed words.
    assert(this.duration, 'No duration set.');

    // Start by assuming that the first word is at 0 seconds
    var earlierTimestamp = 0, earlierIndex = 0;

    for (var i=0; i<this.length; i++)
    {
        var word = this[i];

        // If the last word is not timed, implicitly assume that it is at the
        // end of the audio file.
        var timeOfThisWord = word.time;
        if (!timeOfThisWord && i==this.length-1)
            timeOfThisWord = this.duration;

        // Find the first word with a timestamp later than the
        // one we are looking for.
        if (timeOfThisWord && timeOfThisWord >= timestamp) {
            // Determine the index of ``timestamp`` in between the
            // two timed words.
            var relPosBetweenBounds =
                (timestamp - earlierTimestamp) /
                    (timeOfThisWord - earlierTimestamp);
            var index =  earlierIndex + (
                relPosBetweenBounds * (i-earlierIndex));
            return parseInt(index);
        }

        if (word.time) {
            earlierIndex = i; earlierTimestamp = word.time;
        }
    }
};


/**
 * For the word the given index, return it's timestamp.
 *
 * If the word has no explicit timestamp set, try to approximate the value
 * based on boundaries from earlier and later words.
 *
 * @param index Index of the word whose timestamp to return.
 */
Lyrics.prototype.getApproximateTime = function(index)
{
    assert(index.constructor === Number, 'index must be a Number');

    // Search for nearest timestamp earlier in text
    var earlierTimestamp = 0, earlierIndex = 0;
    for (var i=index-1; i>=0; i--) {
        if (this[i].time) {
            earlierIndex = i;
            earlierTimestamp = this[i].time;
            break;
        }
    }

    // Search for nearest timestamp later in text
    var laterTimestamp = this.duration, laterIndex = this.length-1;
    for (var i=index+1; i<this.length; i++) {
        if (this[i].time) {
            laterIndex = i;
            laterTimestamp = this[i].time;
            break;
        }
    }

    //console.log('index from '+earlierIndex+' to '+laterIndex);
    //console.log('timestamp from '+earlierTimestamp+' to '+laterTimestamp);
    var relPos = (index-earlierIndex) / (laterIndex-earlierIndex);
    return earlierTimestamp + relPos * (laterTimestamp - earlierTimestamp);
};


/**
 * Export to Enhanced LRC.
 *
 * Since we don't store any "line" information per se, we have to determine
 * where to break the word sequence in lines. Sentence boundaries and longer
 * than average time distances could be considered. TODO: Currently, we simply
 * split after a fixed number of words.
 */
Lyrics.prototype.toELRC = function() {
    var result = '';
    var wordsInLine = 0;
    for (var i=0; i<this.length; i++) {
        var word = this[i];

        // Start a new line when: This is the first line, OR: After 10 words
        // but only if the word is timed.
        if (!wordsInLine || (wordsInLine >= 10 && word.time)) {
            wordsInLine = 0;
            result += '\n['+Lyrics.toTimer((word.time || 0))+']';
        }
        else if (word.time)
            result += ' <'+Lyrics.toTimer(word.time)+'>';

        result += ' ' + word.text;
        wordsInLine += 1;
    }
    return result;
}


Lyrics.fromText = function(text, duration) {
    splitted = $.map(text.split(/\s+/g), function(item) {
        return {text: item, time: null};
    });
    lyrics = new Lyrics(duration);
    lyrics.push.apply(lyrics, splitted);
    return lyrics;
}


/**
 * Format a time in seconds in human readable form.
 *
 * From the  Buzz! HTML 5 audio player library.
 *
 * @param time
 * @param withHours
 * @return {String}
 */
Lyrics.toTimer = function(time, withHours) {
    var h, m, s, ms;
    h = Math.floor( time / 3600 );
    h = isNaN( h ) ? '--' : ( h >= 10 ) ? h : '0' + h;
    m = withHours ? Math.floor( time / 60 % 60 ) : Math.floor( time / 60 );
    m = isNaN( m ) ? '--' : ( m >= 10 ) ? m : '0' + m;
    s = Math.floor( time % 60 );
    s = isNaN( s ) ? '--' : ( s >= 10 ) ? s : '0' + s;
    ms = Math.floor((time - Math.floor(time)) * 1000);
    ms = isNaN( ms ) ? '--' : ( ms >= 100 ) ? ms : ( ms > 10 ) ? '0' + ms : '00' + ms;
    return withHours ? h + ':' + m + ':' + s : m + ':' + s + '.' + ms;
};


/**
 * Controller that renders lyrics, and allows interaction (i.e. set
 * timestamps).
 *
 * @param selector DOM element to use as a container.
 * @param audio HTML5 audio element to which the lyrics belong.
 * @param lyrics An instance of ``Lyrics``.
 * @constructor
 */
LyricsBox = function(selector, audio, lyrics) {
    this.container = container = $(selector);
    this.audio = audio;
    this.setLyrics(lyrics);

    var self = this;

    // While the audio is playing, highlight the current word in the lyrics
    audio.addEventListener('timeupdate', function(e) {
        var index = self.lyrics.getIndexForTime(e.target.currentTime);
        container.find('span').removeClass('current');
        self.lyrics[index].dom.addClass('current');
    });

    // Add a class to the lyrics box whenever the audio is playing.
    audio.addEventListener('play',
        function() { container.addClass('playing') });
    audio.addEventListener('pause',
        function() { container.removeClass('playing') });
};

/**
 * Connect with a new lyrics object.
 *
 * @param lyrics
 */
LyricsBox.prototype.setLyrics = function(lyrics) {
    this.lyrics = lyrics;
    if (this.lyrics)
        this.update();
}

/**
 * Re-render the UI.
 */
LyricsBox.prototype.update = function() {
    this.container.empty();
    var audio = this.audio;

    for (var index = 0; index<this.lyrics.length; index++) {
        var word = this.lyrics[index];
        var elem = $('<span>'+word.text+'</span>');
        // TODO: Can be sped up by using a single handler for all spans.
        (function(word, index)
        {
            // When playing, a left click connects the word with the current
            // playing position. Use "mousedown" here (instead of click),
            // which is closer to the time the user actually decided to click.
            elem.mousedown(function(e) {
                if (e.which !== 1)
                    return;
                if (audio.paused)
                    return;
                word.time = audio.currentTime;
                $(this).addClass('timed');
                $(this).attr('title', Lyrics.toTimer(word.time));
            });

            // On right click, start playing from that word's position.
            elem.on('contextmenu', function(e) {
                var goto = word.time;
                if (goto == null) {
                    goto = lyrics.getApproximateTime(index);
                }
                audio.play();
                audio.currentTime = goto - 1.5;  // go to shortly before
                e.preventDefault();
                return false;
            });
        })(word, index);
        word.dom = elem;
        this.container.append(elem);
        this.container.append(' ');
    }
};