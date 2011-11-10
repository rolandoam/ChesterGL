#ifdef GL_ES
precision highp float;
#endif

uniform float u_time; // the lifetime of a particle
uniform mat4  uMVPMatrix; // the model view projection matrix of the particle system

attribute float a_lifetime;
attribute vec3  a_startPosition;
attribute vec3  a_endPosition;

varying float   v_lifetime;

void main(void) {
	v_lifetime = clamp(u_time / a_lifetime, 0.0, 1.0);
	if (u_time <= a_lifetime)
	{
		float vel = (u_time / 100.0);
		gl_Position.xyz = a_startPosition + a_endPosition * vel;
		gl_Position.w = 1.0;
	}
	gl_Position = uMVPMatrix * gl_Position;
	gl_PointSize = 40.0;
	v_lifetime = clamp(v_lifetime, 0.0, 1.0);
}
