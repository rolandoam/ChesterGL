#ifdef GL_ES
precision highp float;
#endif

uniform float opacity;

varying vec4 vColor;

void main(void) {
    gl_FragColor = vColor * opacity;
}
