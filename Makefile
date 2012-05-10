all:
	sass media/screen.scss:media/screen.css
	cssprefixer media/screen.css > media/screen.final.css

watch:
	sass --watch media/screen.scss:media/screen.css