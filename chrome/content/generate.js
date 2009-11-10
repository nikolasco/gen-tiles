const Ci = Components.interfaces;
const Cc = Components.classes;

var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

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

/* handy elements to have */
var stringsBundle;
var statPre;
var statMid;
var statPost;

var progressMeter;
var progressLabel;

var imgElm;
var canvasElm;
var canvasCtx;
var dir=false;
var srcPicked;
var destPicked;

//regExp for cleaning directory names
var cleanFile=new RegExp("[\/\-]+");
//files for iterative tiling
var filelist=[];
var IMGCOUNT;
var CURIMGNUM;
var IMGNAME;
function onLoad() {
    stringsBundle = document.getElementById("gen-tiles-bundle");

    statPre = stringsBundle.getString("progressLabelMadeCountPre");
    statMid = stringsBundle.getString("progressLabelMadeCountMid");
    statPost = stringsBundle.getString("progressLabelMadeCountPost");

    progressMeter = document.getElementById("progress-meter");
    progressLabel = document.getElementById("progress-label");
	madeLabel=document.getElementById("made-label");
	
    imgElm = document.getElementById("source-image");
    canvasElm = document.getElementById("tile-canvas");alert(canvasElm.id);
    canvasCtx = canvasElm.getContext("2d");

	srcPicked=document.getElementById("source-picked");
    destPicked = document.getElementById("dest-picked");
}


/**
 * Picks an entire file directory path as source
 */
function pickDirectory(){
	setError("");
    var picker = Cc["@mozilla.org/filepicker;1"]
        .createInstance(Ci.nsIFilePicker);
    picker.init(window, stringsBundle.getString("pickFileTitle"),
                picker.modeGetFolder);
	
	var status = picker.show();
    if (picker.returnCancel == status) { return; }
	
	 var file = picker.file;
	 var errors=[];
	if (!file.isReadable()) { errors.push(stringsBundle.getString("errorNotReadable")); }
	
	setError(errors);
    if (errors.length) { return; }
	
	dir=file.isDirectory();

    srcPicked.value = file.path;
}
/**
 * Picks a single file as its source
 */
function pickSource() {
    setError("");
    var picker = Cc["@mozilla.org/filepicker;1"]
        .createInstance(Ci.nsIFilePicker);
    picker.init(window, stringsBundle.getString("pickFileTitle"),
                picker.modeOpen);
    picker.appendFilters(picker.filterImages);

    var status = picker.show();
    if (picker.returnCancel == status) { return; }

    var file = picker.file;
    var errors = [];
    //if (!file.isFile()) { errors.push(stringsBundle.getString("errorNotFile")); }
   	
	if (!file.isReadable()) { errors.push(stringsBundle.getString("errorNotReadable")); }
	
	setError(errors);
    if (errors.length) { return; }
	
	dir=file.isDirectory();

    srcPicked.value = file.path;
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

    destPicked.value = file.path;
}

var imgDims;
function generateTiles() {
	if (dir) {
		iterativeGenerateTiles();
		return;
	}
	else {
		var imgFileName = document.getElementById("source-picked").value;
		var dirName = destPicked.value;
		
		if (!imgFileName) {
			setError("Must choose an image");
			return;
		}
		if (!dirName) {
			setError("Must choose a directory");
			return;
		}
		
		setError("");
		progressMeter.setAttribute("mode", "undetermined");
		
		var imgFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		imgFile.followLinks = true;
		imgFile.initWithPath(imgFileName);
		
		try {
			imgDims = imageDimensions(imgFile);
		} 
		catch (e) {
			setError(e.toString());
		}
		
		var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var imgURL = ioService.newFileURI(imgFile);
		imgElm.setAttribute("src", imgURL.spec);
	}
}

function iterativeGenerateTiles(){
	var imgFileName = document.getElementById("source-picked").value;
	var dirName = destPicked.value;
	
	if (!imgFileName) {
		setError("Must choose an image");
		return;
	}
	if (!dirName) {
		setError("Must choose a directory");
		return;
	}
	setError("");
	progressMeter.setAttribute("mode", "undetermined");
	progressLabel.value="Going through "+imgFileName;
	//crawl through this person's directory
 	var extRe = new RegExp("\\.([^.]*)$");
	var egon=Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
	egon.followLinks=true;
	egon.initWithPath(imgFileName);//directory
	if(imgFileName.charAt(imgFileName.length-1)!=="/"){
		imgFileName+="/";
	}
	//create method to calculate size of person's hdrive and required
	//space needed for all the tiles 
	
	//traverse directory
	var children=egon.directoryEntries;
	var child;
	
	while(children.hasMoreElements()){
		child=children.getNext().QueryInterface(Ci.nsILocalFile);
		if(child.isFile()){
			var parts=extRe.exec(child.leafName);
			if((parts[1])&&(mimeTypes[parts[1].toLowerCase()])){
				filelist.push({
					path: imgFileName + child.leafName,
					name: child.leafName
				});
			}
		}
	}
	//start with first filename - contGenerate will generate the rest
	IMGCOUNT=filelist.length;
	CURIMGNUM=0;
	nextImage();
	
	
}

function nextImage(){
	if(CURIMGNUM<IMGCOUNT){
		imgFileName=filelist[CURIMGNUM].path;
			
		IMGNAME=filelist[CURIMGNUM].name;
		var n=IMGNAME.indexOf(".");
		temp=IMGNAME.substring(0,(n));
		IMGNAME=temp.replace(cleanFile,"");
		
		
		progressLabel.value="Now Tiling: "+imgFileName+ " ("+ (CURIMGNUM+1)+" of "+IMGCOUNT+" image files)";
		//create the nsiFile pointer
		var imgFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		imgFile.followLinks = true;
		imgFile.initWithPath(imgFileName);
		
		try {
			imgDims = imageDimensions(imgFile);
		} 
		catch (e) {
			setError(e.toString());
		}
		
		var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var imgURL = ioService.newFileURI(imgFile);
		
		imgElm.setAttribute("src", imgURL.spec);
		
	} else {
		//End
		progressMeter.value = "100";
       madeLabel.value +="\n"+ stringsBundle.getString("progressLabelDone");
        imgElm.setAttribute("src", "");
	}
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


const TILE_HEIGHT = 256;
const TILE_WIDTH = 256;

var totalTileCount = 0;
function contGenerate() {
    canvasElm.setAttribute("width", TILE_WIDTH);
    canvasElm.setAttribute("height", TILE_HEIGHT);
	// just count first
    var tn = 0;
    var sw = TILE_WIDTH;
    var sh = TILE_HEIGHT;
    while (sw < imgDims.w || sh < imgDims.h) {
        var sy = 0;
        while (sy < imgDims.h) {
            var sx = 0;
            while (sx < imgDims.w) {
                sx += sw;
                tn++;

                totalTileCount = tn;
            }
            sy += sh;
        }
        sh *= 2;
        sw *= 2;
    }

    progressMeter.setAttribute("mode", "determined");
    progressMeter.value = "0";
    progressLabel.value = [statPre, 0, statMid, totalTileCount, statPost].join(" ");

    window.setTimeout(genImage, 1, TILE_HEIGHT, TILE_WIDTH, 0, 0, 0, 0, 0, 0);
}

function genImage(sh, sw, zl, sy, yn, sx, xn, tn) {
    if (sw >= imgDims.w) sw = imgDims.w;
    if (sh >= imgDims.h) sh = imgDims.h;
    canvasCtx.drawImage(imgElm, sx, sy, sw, sh, 0, 0, TILE_WIDTH, TILE_HEIGHT);

    var outDir = destPicked.value;
    var outFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    outFile.followLinks = true;
    outFile.initWithPath(outDir);
	outFile.append(IMGNAME);
	
	
	 if(!outFile.exists()) {
		outFile.create(Ci.nsIFile.DIRECTORY_TYPE, 0777);
		progressLabel.value="\nCreated "+outFile.path;
	}
	
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
    madeLabel.value +="\n"+ [statPre, tn, statMid, totalTileCount, statPost].join(" ");

    // generate the next image? if so, increment, etc. appropriately
    if (sw < imgDims.w || sh < imgDims.h) {
		if (sy < imgDims.h) {
			if (sx < imgDims.w) {
				sx += sw;
				xn++;
				tn++;
			}
			else {
				sx = 0;
				xn = 0;
				sy += sh;
				yn++;
			}
		}
		else {
			sy = 0;
			yn = 0;
			
			sh *= 2;
			sw *= 2;
			zl++;
		}
		window.setTimeout(genImage, 1, sh, sw, zl, sy, yn, sx, xn, tn);
	}else if (filelist.length > 0) {
		//still have some more images to do
		CURIMGNUM++;
		nextImage();
	} else {
		//End
        progressMeter.value = "100";
        madeLabel.value = stringsBundle.getString("progressLabelDone");
        imgElm.setAttribute("src", "");
    }
}