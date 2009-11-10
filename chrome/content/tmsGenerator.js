/***
 * Generates TMS-compliant tiles
 */

function TMSGen(args){
	genObject.call(this,args);
	this.resizeCanvas=document.getElementById('resize-canvas');
	this.resizeCtx=this.resizeCanvas.getContext('2d');
	
	this.fullsize={};
	this.serviceVersion=args.serviceVersion;
	this.maxZoom=(args.maxZoom)?args.maxZoom:5;
}

TMSGen.prototype = {
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
			
			//determine the name for the layer
			this.IMGNAME=imgFile.leafName;
			var n=this.IMGNAME.indexOf(".");
			var temp=this.IMGNAME.substring(0,(n));
			this.IMGNAME=temp.replace(this.cleanFile,"");
			this.IMGCOUNT=1;
			this.CURIMGNUM=0;
			var imgURL = this.ioService.newFileURI(imgFile);
			this.imgElm.setAttribute("width",this.imgDims.w);
			this.imgElm.setAttribute("height",this.imgDims.h);
			
			this.imgElm.setAttribute("src", imgURL.spec);
		}
	},
	contGenerate: function(){
		this.imgElm.setAttribute("display","block");
		//overwriting original
		this.canvasElm.setAttribute("width", this.TILE_WIDTH);
		this.canvasElm.setAttribute("height", this.TILE_HEIGHT);
		// just count first
		var tn = 0;
		var zl=0;
		var sw = this.imgDims.w;
		var sh = this.imgDims.h;
		/*
while(zl<this.maxZoom){
			var sy=0;
			while(sy<this.imgDims.h){
				var sx=0;
				while(sx<this.imgDims.w){
					sx+=sw;
					tn++;
					this.totalTileCount=tn;
				}
				sy+=sh;
			}
			sh/=2;
			sw/=2;
			zl++;
		}
		
*/
		this.progressMeter.setAttribute("mode", "determined");
		this.progressMeter.value = "0";
		//this.progressLabel.value = [this.statPre, 0, this.statMid, this.totalTileCount, this.statPost].join(" ");
		
		var startsw=this.TILE_WIDTH;
		var startsh=this.TILE_HEIGHT;
		
		while((startsw<this.imgDims.w)||(startsh<this.imgDims.h)){
			startsw*=2;
			startsh*=2;
		}
		
		//set resize canvas to this starting height and width
		this.resizeCanvas.setAttribute("width",startsw);
		this.resizeCanvas.setAttribute("height",startsh);
		//set fullsize property to total square size of image
		this.fullsize={w:startsw,h:startsh};
		var vx=(this.fullsize.w-this.imgDims.w)/2;
		var vy=(this.fullsize.h-this.imgDims.h)/2;
		this.totalTileCount=Math.pow((this.fullsize.w/this.TILE_WIDTH),2);
		//draw the image element and free up memory
		
		this.resizeCtx.drawImage(this.imgElm,0,0,this.imgDims.w,this.imgDims.h,vx,vy,this.imgDims.w,this.imgDims.h);

		this.imgElm.setAttribute("src", "");
		
		//alert(vx+', '+vy+', startsw: '+startsw+', startsh: '+startsh+', '+this.imgDims.w+', '+this.imgDims.h);
		
		
		window.setTimeout(function(obj,w,h,vx,vy){
			obj.genTMS(h, w, 0, 0, 0, 0, 0, 0);
		}, 1, this,this.fullsize.w,this.fullsize.h,vx,vy);


	},
	genTMS: function(sh, sw, zl, sy, yn, sx, xn, tn){
		//overwriting original
		//generating TMS tiles of such file type:
		//  serviceVersion/IMGNAME/ZL/XN/YN.[mimetype]
	
		
		/*
if (zl == 0) {
			resize=true;
			
			if (resize) {
				var rwidth=this.TILE_WIDTH;
				var rheight=this.TILE_HEIGHT;
				while((rwidth<tsw)&&(rheight<tsh)){
					rwidth*=2;
					rheight*=2;
				}
				this.resizeCanvas.style.width = rwidth + "px";
				this.resizeCanvas.style.height = rheight + 'px';
				
				var vx=(rwidth-tsw)/2;
				var vy=(rheight-tsh)/2;
				this.resizeCtx.drawImage(this.imgElm,vx,vy,tsw,tsh);
				
			}
		}
*/
		
		//this.progressLabel.value="canvas draws: "+sx+', '+sy+', '+tsw+', '+tsh+', tn: '+tn+' imgDims w,h: '+this.imgDims.w+', '+this.imgDims.h;
		this.canvasCtx.drawImage(this.resizeCanvas, sx, sy, sw, sh, 0, 0, this.TILE_WIDTH, this.TILE_HEIGHT);
		
		
		//calculate row/column
		var row=(Math.pow(2,zl)==1)?0:Math.pow(2,zl)-yn;
		var col=xn;
		this.progressLabel.value="row: "+row+" col: "+col;
		
		var outDir = this.destPicked.value;
		var outFile = this.Cc["@mozilla.org/file/local;1"].createInstance(this.Ci.nsILocalFile);
		outFile.followLinks = true;
		outFile.initWithPath(outDir);
		
		outFile.appendRelativePath([this.serviceVersion, this.IMGNAME,zl, col].join("/"));
		
		if (!outFile.exists()) {
			outFile.create(this.Ci.nsIFile.DIRECTORY_TYPE, 0777);
		}
		outFile.appendRelativePath(row+this.outputMimetype);
		//if (!outFile.exists) {
			var dataURI = this.ioService.newURI(this.canvasElm.toDataURL(), "UTF8", null);
			// clear the canvas at the first chance
			this.canvasElm.width = this.canvasElm.width;
			
			var persister = this.Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(this.Ci.nsIWebBrowserPersist);
			persister.persistFlags |= this.Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
			persister.saveURI(dataURI, null, null, null, null, outFile);
			
			// update progress
			this.progressMeter.value = ((tn * 100) / this.totalTileCount).toFixed(0);
			this.madeLabel.value = "\n" + [this.statPre, tn, this.statMid, this.totalTileCount, this.statPost].join(" ");
		//}
		
		// generate the next image? if so, increment, etc. appropriately
		// pretty much backwards from original Nikolas version
		if (sw < this.fullsize.w || sh < this.fullsize.h) {
			this.progressLabel.value+=" zl: "+zl+", sx: "+sx+", sy: "+sy;
			if (sy<this.fullsize.h) {
				if (sx < this.fullsize.w) {
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
			} else if(zl<this.maxZoom){
				zl++;
				sx=0;
				sy=0;
				xn = 0;
				yn = 0;
				
				sh /= 2;
				sw /= 2;
				
			} else {
				//reset
				zl=0;
				sx=0;
				sy=0;
				xn = 0;
				yn = 0;
				tn=0;
				sh = 0;
				sw = 0;
				this.CURIMGNUM++;
				this.nextImage();
				return;
			}
			
			window.setTimeout(function(obj, sh, sw, zl, sy, yn, sx, xn, tn){
				obj.genTMS(sh, sw, zl, sy, yn, sx, xn, tn);
			}, 1, this,sh, sw, zl, sy, yn, sx, xn, tn);
			
		} else if(zl<this.maxZoom){
			zl++;
			
			xn = 0;
			yn = 0;
			sx=0;
			sy=0;
			sh /= 2;
			sw /= 2;
			
			
			window.setTimeout(function(obj, sh, sw, zl, sy, yn, sx, xn, tn){
				obj.genTMS(sh, sw, zl, sy, yn, sx, xn, tn);
			}, 1, this,sh, sw, zl, sy, yn, sx, xn, tn);
		} else {
			this.CURIMGNUM++;
			this.nextImage();
		}
	}
}
extend(TMSGen,genObject);