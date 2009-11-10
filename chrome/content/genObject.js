/**
 * Top-level class for generating tiles
 */

function genObject(args){
	//mime type setup
	this.mimeTypes = {
	    "gif": "image/gif",
	    "jpg": "image/jpeg",
	    "jpeg": "image/jpeg",
	    "png": "image/png",
	    "tif": "image/tiff",
	    "tiff": "image/tiff"
	};
	this.outputMimetype=(args.mime)?args.mime:".png";
	this.stringsBundle=document.getElementById("gen-tiles-bundle");
	this.statPre = this.stringsBundle.getString("progressLabelMadeCountPre");
    this.statMid = this.stringsBundle.getString("progressLabelMadeCountMid");
    this.statPost = this.stringsBundle.getString("progressLabelMadeCountPost");

    this.progressMeter = document.getElementById("progress-meter");
    this.progressLabel = document.getElementById("progress-label");
	this.madeLabel=document.getElementById("made-label");
	
    this.imgElm = document.getElementById("source-image");
    this.canvasElm = document.getElementById("tile-canvas");
    this.canvasCtx = this.canvasElm.getContext("2d");
	this.srcPicked=document.getElementById("source-picked");
    this.destPicked = document.getElementById("dest-picked");
	
	this.errorList=document.getElementById("error-list");
	
	this.TILE_WIDTH=(args.tilewidth)?args.tilewidth:256;
	this.TILE_HEIGHT=(args.tileheight)?args.tileheight:256;
	this.totalTileCount=0;
	this.dir=false;
	this.imgDims=[];
	//regExp for cleaning directory names
	this.cleanFile=new RegExp("[\/\-]+");
	//files for iterative tiling
	this.filelist=[];
	this.IMGCOUNT=0;
	this.CURIMGNUM;
	this.IMGNAME;
	this.Cc=Components.classes;
	this.Ci=Components.interfaces;	
	//specific modules
	this.ioService=this.Cc["@mozilla.org/network/io-service;1"].getService(this.Ci.nsIIOService);
	this.writeService=this.Cc["@mozilla.org/file/local;1"];
	
}
genObject.prototype={
	setError:function(e){
		
 	   this.errorList.value=("string" == typeof(e))? e : e.join(", ");

	},
	pickDirectory:function(){
		this.setError("");
	    var picker = this.Cc["@mozilla.org/filepicker;1"]
	        .createInstance(this.Ci.nsIFilePicker);
	    picker.init(window, this.stringsBundle.getString("pickFileTitle"),
	                picker.modeGetFolder);
		
		var status = picker.show();
	    if (picker.returnCancel == status) { return; }
		
		 var file = picker.file;
		 var errors=[];
		if (!file.isReadable()) { errors.push(this.stringsBundle.getString("errorNotReadable")); }
		
		this.setError(errors);
	    if (errors.length) { return; }
		
		this.dir=file.isDirectory();
	
	    this.srcPicked.value = file.path;
	},
	pickSource:function(){
		this.setError("");
	    var picker = this.Cc["@mozilla.org/filepicker;1"]
	        .createInstance(this.Ci.nsIFilePicker);
	    picker.init(window, this.stringsBundle.getString("pickFileTitle"),
	                picker.modeOpen);
	    picker.appendFilters(picker.filterImages);
	
	    var status = picker.show();
	    if (picker.returnCancel == status) { return; }
	
	    var file = picker.file;
	    var errors = [];
	    //if (!file.isFile()) { errors.push(stringsBundle.getString("errorNotFile")); }
	   	
		if (!file.isReadable()) { errors.push(this.stringsBundle.getString("errorNotReadable")); }
		
		this.setError(errors);
	    if (errors.length) { return; }
		
		this.dir=file.isDirectory();
	
	    this.srcPicked.value = file.path;
	},
	pickDest:function(){
		this.setError("");
	    var picker = this.Cc["@mozilla.org/filepicker;1"]
	        .createInstance(this.Ci.nsIFilePicker);
	    picker.init(window, this.stringsBundle.getString("pickDirectoryTitle"),
	                picker.modeGetFolder);
	
	    var status = picker.show();
	    if (picker.returnCancel == status) { return; }
	
	    var file = picker.file;
	    var errors = [];
	    if (!file.isDirectory()) { errors.push(this.stringsBundle.getString("errorNotDirectory")); }
	    if (!file.isWritable()) { errors.push(this.stringsBundle.getString("errorNotWriteable")); }
	
	    this.setError(errors);
	    if (errors.length) { return; }
	
	    this.destPicked.value = file.path;
	},
	generateTiles:function(){
		if (this.dir) {
			this.iterativeGenerateTiles();
			return;
		}
		else {
			var imgFileName = this.srcPicked.value;
			var dirName = this.destPicked.value;
			
			if (!imgFileName) {
				this.setError("Must choose an image");
				return;
			}
			if (!dirName) {
				this.setError("Must choose a directory");
				return;
			}
			
			this.setError("");
			this.progressMeter.setAttribute("mode", "undetermined");
			
			var imgFile = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
			imgFile.followLinks = true;
			imgFile.initWithPath(imgFileName);
			
			try {
				this.imgDims = this.imageDimensions(imgFile);
			} 
			catch (e) {
				this.setError(e.toString());
			}
			
			this.IMGNAME=imgFileName;
			var n=this.IMGNAME.indexOf(".");
			temp=this.IMGNAME.substring(0,(n));
			this.IMGNAME=temp.replace(this.cleanFile,"");
			this.IMGCOUNT=1;
			this.CURIMGNUM=0;
			var imgURL = this.ioService.newFileURI(imgFile);
			this.imgElm.setAttribute("src", imgURL.spec);
			
		}
	},
	iterativeGenerateTiles:function(){
		var imgFileName = document.getElementById("source-picked").value;
		var dirName = this.destPicked.value;
		
		if (!imgFileName) {
			this.setError("Must choose an image");
			return;
		}
		if (!dirName) {
			this.setError("Must choose a directory");
			return;
		}
		this.setError("");
		this.progressMeter.setAttribute("mode", "undetermined");
		
		//crawl through this person's directory
	 	var extRe = new RegExp("\\.([^.]*)$");
		var egon=this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
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
			child=children.getNext().QueryInterface(this.Ci.nsILocalFile);
			if(child.isFile()){
				var parts=extRe.exec(child.leafName);
				if((parts[1])&&(this.mimeTypes[parts[1].toLowerCase()])){
					this.filelist.push({
						path: imgFileName + child.leafName,
						name: child.leafName
					});
				}
			}
		}
		
		//start with first filename - contGenerate will generate the rest
		this.IMGCOUNT=this.filelist.length;
		this.CURIMGNUM=0;
		this.nextImage();
	},
	nextImage:function(){
		if(this.CURIMGNUM<this.IMGCOUNT){
			imgFileName=this.filelist[this.CURIMGNUM].path;
				
			this.IMGNAME=this.filelist[this.CURIMGNUM].name;
			var n=this.IMGNAME.indexOf(".");
			temp=this.IMGNAME.substring(0,(n));
			this.IMGNAME=temp.replace(this.cleanFile,"");
			
			
			//this.progressLabel.value="Now Tiling: "+imgFileName+ " ("+ (this.CURIMGNUM+1)+" of "+this.IMGCOUNT+" image files)";
			//create the nsiFile pointer
			var imgFile = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
			imgFile.followLinks = true;
			imgFile.initWithPath(imgFileName);
			
			try {
				this.imgDims = this.imageDimensions(imgFile);
				
			} 
			catch (e) {
				this.setError(e.toString());
			}
			
			//var ioService = this.Cc["@mozilla.org/network/io-service;1"].getService(this.Ci.nsIIOService);
			var imgURL = this.ioService.newFileURI(imgFile);
			
			this.imgElm.setAttribute("src", imgURL.spec);
			
		} else {
			//End
			this.progressMeter.value = "100";
	       	//this.madeLabel.value ="\n"+ this.stringsBundle.getString("progressLabelDone");
	        this.imgElm.setAttribute("src", "");
		}
	},
	imageDimensions:function(imgFile){
		var stream = this.Cc["@mozilla.org/network/file-input-stream;1"].
        createInstance(this.Ci.nsIFileInputStream);
	    stream.init(imgFile, -1, -1, 0);
	
	    var bufferedStream = this.Cc["@mozilla.org/network/buffered-input-stream;1"].
	              createInstance(this.Ci.nsIBufferedInputStream);
	    bufferedStream.init(stream, 8192);
	    var extRe = new RegExp("\\.([^.]*)$");
	    var parts = extRe.exec(imgFile.path);
	    var ext = parts[1];
	    // note: we could probably use a sniffer
	    if (!ext) { throw("File has no extension!"); }
	
	    var mimeType = this.mimeTypes[ext.toLowerCase()];
	    if (!mimeType) { throw("Unknown extension!"); }
	
	    var imgTools = this.Cc["@mozilla.org/image/tools;1"].getService(this.Ci.imgITools);
	
	    var outTmp = {value: null};
	    imgTools.decodeImageData(bufferedStream, mimeType, outTmp);
	    if (!outTmp.value) {throw("Didn't get a container!");}
		
	    return {w: outTmp.value.width, h: outTmp.value.height};
	},
	contGenerate:function(){
		this.canvasElm.setAttribute("width", this.TILE_WIDTH);
	    this.canvasElm.setAttribute("height", this.TILE_HEIGHT);
		// just count first
	    var tn = 0;
	    var sw = this.TILE_WIDTH;
	    var sh = this.TILE_HEIGHT;
	    while (sw < this.imgDims.w || sh < this.imgDims.h) {
	        var sy = 0;
	        while (sy < this.imgDims.h) {
	            var sx = 0;
	            while (sx < this.imgDims.w) {
	                sx += sw;
	                tn++;
	
	                this.totalTileCount = tn;
	            }
	            sy += sh;
	        }
	        sh *= 2;
	        sw *= 2;
	    }
	
	    this.progressMeter.setAttribute("mode", "determined");
	    this.progressMeter.value = "0";
	    //this.progressLabel.value = [this.statPre, 0, this.statMid, this.totalTileCount, this.statPost].join(" ");
	
	    window.setTimeout(function(obj){
			obj.genImage(obj.TILE_HEIGHT, obj.TILE_WIDTH, 0, 0, 0, 0, 0, 0);
		}, 1,this);
	},
	genImage:function(sh, sw, zl, sy, yn, sx, xn, tn){
		if (sw >= this.imgDims.w) sw = this.imgDims.w;
	    if (sh >= this.imgDims.h) sh = this.imgDims.h;
	    this.canvasCtx.drawImage(this.imgElm, sx, sy, sw, sh, 0, 0, this.TILE_WIDTH, this.TILE_HEIGHT);
	
	    var outDir = this.destPicked.value;
	    var outFile = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
	    outFile.followLinks = true;
	    outFile.initWithPath(outDir);
		outFile.append(this.IMGNAME);
		
		
		 if(!outFile.exists()) {
			outFile.create(this.Ci.nsIFile.DIRECTORY_TYPE, 0777);
			//this.progressLabel.value="\nCreated "+outFile.path;
		}
		
	    outFile.appendRelativePath(["tile",zl,xn,yn].join("_")+ ".png");
		
		if (outFile.exists()) {
			this.setError(outFile.path + " already exists");
		}
		else {
			var dataURI = this.ioService.newURI(this.canvasElm.toDataURL(), "UTF8", null);
			// clear the canvas at the first chance
			this.canvasElm.width = this.canvasElm.width;
			
			var persister = this.Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(this.Ci.nsIWebBrowserPersist);
			persister.persistFlags |= this.Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
			persister.saveURI(dataURI, null, null, null, null, outFile);
			
			// update progress
			this.progressMeter.value = ((tn * 100) / this.totalTileCount).toFixed(0);
			//this.madeLabel.value = "\n" + [this.statPre, tn, this.statMid, this.totalTileCount, this.statPost].join(" ");
		}
		// generate the next image? if so, increment, etc. appropriately
		if (sw < this.imgDims.w || sh < this.imgDims.h) {
			if (sy < this.imgDims.h) {
				if (sx < this.imgDims.w) {
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
			
			
			window.setTimeout(function(obj, sh, sw, zl, sy, yn, sx, xn, tn){
				obj.genImage(sh, sw, zl, sy, yn, sx, xn, tn);
			}, 1, this);
		}
		else 
			if (this.filelist.length > 0) {
					//still have some more images to do
					this.CURIMGNUM++;
					this.nextImage();
				}
				else {
					//End
					this.progressMeter.value = "100";
					//this.madeLabel.value = this.stringsBundle.getString("progressLabelDone");
					this.imgElm.setAttribute("src", "");
				}
		}
}
