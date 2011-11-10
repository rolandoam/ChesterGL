#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;

varying vec4 vColor;
varying vec2 vTextureCoord;

void main(void) {
    vec4 textureColor = texture2D(uSampler, vTextureCoord);
    gl_FragColor = textureColor * vColor;
}
