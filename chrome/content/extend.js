/**
 * extend() is not a built-in Javascript function
 * 
 * Taken from developer.mozilla.org/en/Core_Javascript_1.5_Guide/Inheritance
 * 
 */

 
function extend(child,supertype){
	child.prototype.__proto__ = supertype.prototype;
}
