#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
attribute vec2 aTextureCoord;

uniform mat4 uMVPMatrix;

varying vec2 vTextureCoord;
varying vec4 vColor;

void main(void) {
    gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
	vColor = aVertexColor;
}
