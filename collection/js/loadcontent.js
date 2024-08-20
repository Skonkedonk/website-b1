function loadHTML(url, elementId, callback) {
    console.log(`Loading HTML from ${url} into element with ID ${elementId}`);
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log(`Successfully loaded HTML from ${url}`);
                
                var element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = xhr.responseText;
                    console.log(`HTML content successfully injected into element with ID ${elementId}`);
                    
                    if (callback) {
                        // Execute scripts and then run the callback
                        executeScripts(element, callback);
                    } else {
                        // Just execute scripts
                        executeScripts(element);
                    }
                } else {
                    console.error(`Element with ID ${elementId} not found.`);
                }
            } else {
                console.error(`Failed to load ${url}. Status: ${xhr.status}`);
            }
        }
    };
    
    xhr.send();
}

function executeScripts(element, callback) {
    var scripts = element.getElementsByTagName('script');
    console.log(`Executing ${scripts.length} scripts in the loaded content`);
    
    for (var i = 0; i < scripts.length; i++) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        
        if (scripts[i].src) {
            script.src = scripts[i].src;
            console.log(`Loading script from ${scripts[i].src}`);
        } else {
            script.innerHTML = scripts[i].innerHTML;
            console.log('Executing inline script');
        }
        
        document.head.appendChild(script);
        
        // Once the script is appended and executed, you can call the callback
        if (callback && i === scripts.length - 1) {
            script.onload = callback;
        }
    }
}
