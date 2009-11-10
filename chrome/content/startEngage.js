/**
 * Contians function engage, which you use to 
 * instantiate all genObject references to methods
 */


var b=null;

/**
 * ref: String value determining the intended method to call
 * @param {Object} ref
 */
function engage(ref){
	if(!b){
		b=new TMSGen({serviceVersion:"1.0.0",
		tilewidth:256,
		tileheight:256
		});
	}
	
	switch(ref){
		case 'pickDirectory':
			b.pickDirectory();
			break;
		case 'generateTiles':
			b.generateTiles();
			break;
		case 'pickSource':
			b.pickSource();
			break;
		case 'pickDest':
			b.pickDest();
			break;
		case 'contGenerate':
			b.contGenerate();
			break;
		default:
			b.setError("Whoops...");
			break;
	}
}
