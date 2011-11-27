#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform vec4      u_startColor;
uniform vec4      u_endColor;

varying float v_lifetime;

void main(void) {
    vec4 textureColor = texture2D(uSampler, gl_PointCoord);
	
	vec4 curColor = mix(u_startColor, u_endColor, v_lifetime);
	gl_FragColor = textureColor * curColor;
	gl_FragColor.a *= (1.0 - v_lifetime);
}
