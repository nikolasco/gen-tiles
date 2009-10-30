const Ci = Components.interfaces;
const Cc = Components.classes;

const mimeTypes = {
    "gif": "image/gif",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "tif": "image/tiff",
    "tiff": "image/tiff"
};

/* string bundle, fetched on load */
var stringsBundle;

function onLoad() {
    stringsBundle = document.getElementById("gen-tiles-bundle");
}

function imageDimensions(imgFile) {
    var stream = Cc["@mozilla.org/network/file-input-stream;1"].
        createInstance(Ci.nsIFileInputStream);
    stream.init(imgFile, -1, -1, 0);

    var bufferedStream = Cc["@mozilla.org/network/buffered-input-stream;1"].
              createInstance(Ci.nsIBufferedInputStream);
    bufferedStream.init(stream, 8192);

    var extRe = new RegExp("\\.([^.]*)$");
    var parts = extRe.exec(imgFile.path);
    var ext = parts[1];
    // note: we could probably use a sniffer
    if (!ext) { throw("File has no extension!"); }

    var mimeType = mimeTypes[ext.toLowerCase()];
    if (!mimeType) { throw("Unknown extension!"); }

    var imgTools = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);

    var outTmp = {value: null};
    imgTools.decodeImageData(bufferedStream, mimeType, outTmp);
    if (!outTmp.value) {throw("Didn't get a container!");}

    return {w: outTmp.value.width, h: outTmp.value.height};
}

function pickSource() {
    var picker = Cc["@mozilla.org/filepicker;1"]
        .createInstance(Ci.nsIFilePicker);
    picker.init(window, stringsBundle.getString("pickFileTitle"),
                picker.modeOpen);
    picker.appendFilters(picker.filterImage);

    var status = picker.show();
    if (picker.returnCancel == status) { return; }

    var file = picker.file;
    var errors = [];
    if (!file.isFile()) { errors.push(stringsBundle.getString("errorNotFile")); }
    if (!file.isReadable()) { errors.push(stringsBundle.getString("errorNotReadable")); }

    var errorsDesc = document.getElementById("error-list").value = errors.join(", ");
    if (errors.length) { return; }

    document.getElementById("source-picked").value = file.path;
}

function pickDest() {
    var picker = Cc["@mozilla.org/filepicker;1"]
        .createInstance(Ci.nsIFilePicker);
    picker.init(window, stringsBundle.getString("pickDirectoryTitle"),
                picker.modeGetFolder);

    var status = picker.show();
    if (picker.returnCancel == status) { return; }

    var file = picker.file;
    var errors = [];
    if (!file.isDirectory()) { errors.push(stringsBundle.getString("errorNotDirectory")); }
    if (!file.isWritable()) { errors.push(stringsBundle.getString("errorNotWriteable")); }

    var errorsDesc = document.getElementById("error-list");
    errorsDesc.value = errors.join(", ");
    if (errors.length) { return; }

    document.getElementById("dest-picked").value = file.path;
}

function generateTiles() {
    var imgFileName = document.getElementById("source-picked").value;
    var dirName = document.getElementById("dest-picked").value;

    var imgFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile); 
    imgFile.followLinks = true;
    imgFile.initWithPath(imgFileName);

    var dims;
    try {
        dims = imageDimensions(imgFile);
    } catch (e) {
        document.getElementById("error-list").value = e.toString();
    }

    alert(uneval(dims));
}