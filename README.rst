Quick and dirty webapp to create `Enhanced LRC files`__ by mouse clicking
and button pressing.

Try it: http://stage.elsdoerfer.com/elrcmaker/

__ http://en.wikipedia.org/wiki/LRC_(file_format)#Simple_format_extended


Coding notes
============

This is designed to be able to run from ``file://``.

The Python package ``webassets`` is required to build the CSS/JS code
(``easy_install webassets``).

Run ``make`` to build assets.

During development, run ``make watch`` to auto-update assets when source
files change.