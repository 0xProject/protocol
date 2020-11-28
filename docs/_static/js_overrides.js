// Open external links in a new window.
$(document).ready(function () {
    $('a[href^="http://"], a[href^="https://"]').not('a[class*=internal]').attr('target', '_blank');

    $(".researchPdf").height($( document ).height() * 0.8);
 });

$( window ).resize(function() {
    $(".researchPdf").height($( document ).height() * 0.8);
});