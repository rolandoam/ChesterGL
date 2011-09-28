#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uSampler;
uniform float opacity;

varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
    vec4 textureColor = texture2D(uSampler, vTextureCoord) * opacity;
    gl_FragColor = textureColor * vColor;
}
