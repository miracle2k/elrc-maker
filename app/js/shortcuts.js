/**
 * Wraps and implements our app's keyboard shortcuts.
 *
 * For this, it needs access to all the controllable parts of the app.
 *
 * In the future, those could be made customizable.
 *
 * @constructor
 */
Shortcuts = function(audio, setPlaybackRate) {
    $(document).on('keydown', function(e) {
        if (e.keyCode == 38) { // up
            setPlaybackRate('+0.1');
            return false;
        }
        else if (e.keyCode == 40) {  // down
            setPlaybackRate('-0.1');
            return false;
        }
        else if (e.keyCode == 32) {  // space
            if (audio.paused) {
                audio.play();
                return false;
            }
            else if (e.ctrlKey) {
                audio.pause();
                return false;
            }
        }
        else if (e.keyCode == 37) {  // left
            if (e.ctrlKey) {
                audio.currentTime -= 1;
                return false;
            }
        }
        else if (e.keyCode == 39) {  // right
            if (e.ctrlKey) {
                audio.currentTime += 1;
                return false;
            }
        }
    });
}