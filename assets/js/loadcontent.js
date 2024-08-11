function loadHTML(url, elementId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = xhr.responseText;
                // Execute scripts after DOM is updated
                setTimeout(function() {
                    executeScripts(element);
                }, 0); // Delay added to ensure DOM is updated
            }
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