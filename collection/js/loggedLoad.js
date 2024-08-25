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
                    
                    // Execute scripts after injecting the HTML
                    executeScripts(element, callback);
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
    console.log(`Found ${scripts.length} scripts in the loaded content`);

    var loadNextScript = function(index) {
        if (index < scripts.length) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            
            if (scripts[index].src) {
                script.src = scripts[index].src;
                console.log(`Loading script from ${scripts[index].src}`);

                script.onload = function() {
                    loadNextScript(index + 1);
                };

                script.onerror = function() {
                    console.error(`Failed to load script: ${scripts[index].src}`);
                    loadNextScript(index + 1); // Skip to the next script even if this one fails
                };
            } else {
                script.innerHTML = scripts[index].innerHTML;
                console.log('Executing inline script');
                document.head.appendChild(script);
                
                loadNextScript(index + 1);
            }
            
            document.head.appendChild(script);
        } else if (callback) {
            console.log('All scripts executed, calling the callback');
            callback();
        }
    };
    
    loadNextScript(0);
}
