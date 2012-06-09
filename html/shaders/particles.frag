#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;

varying float v_lifetime;
varying vec4  v_startColor;
varying vec4  v_endColor;

void main(void) {
    vec4 textureColor = texture2D(uSampler, gl_PointCoord);
	
	vec4 curColor = mix(v_startColor, v_endColor, v_lifetime);
	gl_FragColor = textureColor * curColor;
	gl_FragColor.a *= (1.0 - v_lifetime);
}
