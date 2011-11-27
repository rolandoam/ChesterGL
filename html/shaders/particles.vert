#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time; // the lifetime of a particle
uniform mat4  uMVPMatrix; // the model view projection matrix of the particle system

// params: lifetime, start size, end size
attribute float a_lifetime;
attribute float a_startTime;
attribute float a_startSize;
attribute float a_endSize;
attribute vec3  a_speed;
attribute vec3  a_startPosition;

varying float   v_lifetime;

void main(void) {
	float ptime = (u_time - a_startTime);
	v_lifetime = clamp(ptime / (a_startTime + a_lifetime), 0.0, 1.0);
	if (u_time <= a_lifetime + a_startTime)
	{
		float vel = (u_time / 100.0);
		gl_Position.xyz = a_startPosition + (a_speed/1000.0) * ptime;
		gl_Position.w = 1.0;
		gl_Position = uMVPMatrix * gl_Position;
		v_lifetime = clamp(v_lifetime, 0.0, 1.0);
		gl_PointSize = mix(a_startSize, a_endSize, v_lifetime);
	} else {
		// put them away
		gl_Position = vec4(0, 0, 9000.0, 1.0);
		gl_PointSize = 0.0;
	}
}
