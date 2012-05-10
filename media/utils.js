/** Different things. **/


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