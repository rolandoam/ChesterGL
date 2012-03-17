#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;


uniform mat4 uMVPMatrix;

varying vec4 vColor;

void main(void) {
	gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);
	gl_PointSize = 1.0;
	vColor = aVertexColor;
}
