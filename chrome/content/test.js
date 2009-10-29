const Ci = Components.interfaces;
const Cc = Components.classes;

const mimeTypes = {
    "gif": "image/gif",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "tif": "image/tiff",
    "tiff": "image/tiff"
}

var imgTools = Cc["@mozilla.org/image/tools;1"].
               getService(Ci.imgITools);

function generate() {
    
}