function loadHTML(url, elementId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            document.getElementById(elementId).innerHTML = xhr.responseText;
            executeScripts(document.getElementById(elementId));
        }
    };
    xhr.send();
}

function executeScripts(element) {
    var scripts = element.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        if (scripts[i].src) {
            script.src = scripts[i].src;
        } else {
            script.innerHTML = scripts[i].innerHTML;
        }
        document.head.appendChild(script);
    }
}
