/** Different things. **/


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
 * Clear the given text from HTML tags, return only the textual content.
 *
 * @param text
 * @return {*}
 */
function cleanText(text) {
    var dom = jQuery('<div>'+text+'</div>');
    return dom.not('script, style').text();
}
