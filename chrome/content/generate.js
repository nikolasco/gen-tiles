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

function setError(e) {
    document.getElementById("error-list").value = 
        ("string" == typeof(e))? e : e.join(", ");
}

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
    setError("");
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

    setError(errors);
    if (errors.length) { return; }

    document.getElementById("source-picked").value = file.path;
}

function pickDest() {
    setError("");
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

    setError(errors);
    if (errors.length) { return; }

    document.getElementById("dest-picked").value = file.path;
}

var imgDims;
function generateTiles() {
    setError("");
    var progressMeter = document.getElementById("progress-meter");
    progressMeter.setAttribute("mode", "undetermined");

    var imgFileName = document.getElementById("source-picked").value;
    var dirName = document.getElementById("dest-picked").value;

    if (!imgFileName) { setError("Must choose an image"); return; }
    if (!dirName) { setError("Must choose a directory"); return; }

    var imgFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile); 
    imgFile.followLinks = true;
    imgFile.initWithPath(imgFileName);

    try {
        imgDims = imageDimensions(imgFile);
    } catch (e) {
        setError(e.toString());
    }

    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var imgURL = ioService.newFileURI(imgFile);
    var imgElm = document.getElementById("source-image");
    imgElm.setAttribute("src", imgURL.spec);
}

const TILE_HEIGHT = 256;
const TILE_WIDTH = 256;

function contGenerate() {
    var outDir = document.getElementById("dest-picked").value;

    var imgElm = document.getElementById("source-image");
    var canvasElm = document.getElementById("tile-canvas");
    var ctx = canvasElm.getContext("2d");

    canvasElm.setAttribute("width", TILE_WIDTH);
    canvasElm.setAttribute("height", TILE_HEIGHT);

    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

    // just count first
    var totalTileCount = 0;
    var tn = 0;
    var sw = TILE_WIDTH;
    var sh = TILE_HEIGHT;
    while (sw < imgDims.w || sh < imgDims.h) {
        var sy = 0;
        while (sy < imgDims.h) {
            var sx = 0;
            while (sx < imgDims.w) {
                totalTileCount = tn;

                sx += sw;
                tn++;
            }
            sy += sh;
        }
        sh *= 2;
        sw *= 2;
    }

    var progressMeter = document.getElementById("progress-meter");
    progressMeter.setAttribute("mode", "determined");
    progressMeter.value = "0";
    var progressLabel = document.getElementById("progress-label");
    var statPre = stringsBundle.getString("progressLabelMadeCountPre");
    var statMid = stringsBundle.getString("progressLabelMadeCountMid");
    var statPost = stringsBundle.getString("progressLabelMadeCountPost");
    progressLabel.value = [statPre, 0, statMid, totalTileCount, statPost].join(" ");

    tn = 0;
    sw = TILE_WIDTH;
    sh = TILE_HEIGHT;
    var zl = 0;
    while (sw < imgDims.w || sh < imgDims.h) {
        var sy = 0;
        var yn = 0;
        while (sy < imgDims.h) {
            var sx = 0;
            var xn = 0;
            while (sx < imgDims.w) {
                ctx.drawImage(imgElm, sx, sy, sw, sh, 0, 0, TILE_WIDTH, TILE_HEIGHT);

                var outFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile); 
                outFile.followLinks = true;
                outFile.initWithPath(outDir);
                outFile.appendRelativePath(["tile",zl,xn,yn].join("_")+ ".png");

                if(outFile.exists()) {
                    setError(outFile.path + " already exists");
                    return;
                }

                var dataURI = ioService.newURI(canvasElm.toDataURL(), "UTF8", null);
                // clear the canvas at the first chance
                canvasElm.width = canvasElm.width;

                var persister = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                    .createInstance(Ci.nsIWebBrowserPersist);
                persister.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
                persister.saveURI(dataURI, null, null, null, null, outFile);

                // update progress
                progressMeter.value = ((tn*100)/totalTileCount).toFixed(0);
                progressLabel.value = [statPre, tn, statMid, totalTileCount, statPost].join(" ");

                sx += sw;
                xn++;
                tn++;
            }
            sy += sh;
            yn++;
        }
        sh *= 2;
        sw *= 2;
        zl++;
    }

    // done!
    progressMeter.value = "100";
    progressLabel.value = stringsBundle.getString("progressLabelDone");
    imgElm.setAttribute("src", "");
}