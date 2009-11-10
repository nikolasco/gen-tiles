<?php
/**
 * 
 */

if((isset($_GET['src']))&&(isset($_GET['tilewidth']))
&&(isset($_GET['tileheight']))){
		
	miniImage($_GET['src'],$_GET['tilewidth'],$_GET['tileheight']);
}

function miniImage($src,$tilew,$tileh){
	
	$data=getimagesize($src);
	
	$width=$data[0];
	$height=$data[1];
	$mime=$data['mime'];
	$image=null;
	switch($mime){
		case "image/gif":
			$image=imagecreatefromgif($src);
			break;
		case "image/jpeg":
			$image=imagecreatefromjpeg($src);
			break;
		case "image/png":
			$image=imagecreatefrompng($src);
			break;
		
	}
	if($image){
		$maxtilew=$tilew;
		$maxtileh=$tileh;
		while(($tilew<$width)&&($tileh<$height)){
			$tilew*=2;
			$tileh*=2;
		}
		$miniwidth=($tilew*$width)/$maxtilew;
		$miniheight=($tileh*$height)/$maxtileh;
		$container=imagecreatetruecolor($tilew,$tileh);
		$dst_x=($tilew-$miniwidth)/2;
		$dst_y=($tileh-$miniheight)/2;
		imagecopyresized($container,$image,$dst_x,$dst_y,0,0,$miniwidth,$miniheight,$width,$height);
		
		header('Content-Type: image/png');
		
		imagepng($container,"mini.png");
		imagedestroy($container);
		imagedestroy($image);
	}
}
?>